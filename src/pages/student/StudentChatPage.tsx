import { useState, useRef, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Send, Bot, User, Sparkles, Loader2, PanelLeftClose, PanelLeft } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import ChatSidebar from '@/components/chat/ChatSidebar';
import { useChatPersistence, type Msg } from '@/hooks/useChatPersistence';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/student-chat`;

const SUGGESTED_QUESTIONS = [
  'Exam ka format kya hai?',
  'Exam ki preparation kaise karein?',
  'Time management tips for exam',
  'How many questions are in the exam?',
];

export default function StudentChatPage() {
  const { session } = useAuth();
  const {
    conversations,
    activeConversationId,
    messages,
    setMessages,
    loadingConversations,
    loadConversation,
    startNewConversation,
    persistUserMessage,
    persistAssistantMessage,
    deleteConversation,
  } = useChatPersistence();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dailyRemaining, setDailyRemaining] = useState<number | null>(null);
  const [dailyLimit, setDailyLimit] = useState<number>(50);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch daily remaining on mount
  const fetchLimit = useCallback(async () => {
    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ checkLimit: true }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setDailyRemaining(data.remaining);
        setDailyLimit(data.limit);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchLimit();
  }, [fetchLimit]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    if (dailyRemaining !== null && dailyRemaining <= 0) {
      toast.error('Daily message limit reached. Please try again tomorrow.');
      return;
    }

    const userMsg: Msg = { role: 'user', content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    let assistantSoFar = '';
    const allMessages = [...messages, userMsg];

    try {
      const convId = await persistUserMessage(text.trim());

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'AI service error' }));
        if (err.limitReached) {
          setDailyRemaining(0);
        }
        throw new Error(err.error || `Error ${resp.status}`);
      }

      // Update remaining from response headers
      const remaining = resp.headers.get('X-Daily-Remaining');
      const limit = resp.headers.get('X-Daily-Limit');
      if (remaining !== null) setDailyRemaining(Number(remaining));
      if (limit !== null) setDailyLimit(Number(limit));

      if (!resp.body) throw new Error('No response stream');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
                }
                return [...prev, { role: 'assistant', content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Flush remaining buffer
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
                }
                return [...prev, { role: 'assistant', content: assistantSoFar }];
              });
            }
          } catch { /* ignore */ }
        }
      }

      if (assistantSoFar) {
        await persistAssistantMessage(convId, assistantSoFar);
      }
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to get response');
      if (!assistantSoFar) {
        setMessages((prev) => prev.slice(0, -1));
      }
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const limitExhausted = dailyRemaining !== null && dailyRemaining <= 0;

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-8rem)] lg:h-[calc(100vh-6rem)] rounded-lg border border-border overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <div className={`${isMobile ? 'absolute inset-0 z-20 bg-background' : 'w-64 shrink-0'}`}>
            <ChatSidebar
              conversations={conversations}
              activeConversationId={activeConversationId}
              loading={loadingConversations}
              onSelect={(id) => {
                loadConversation(id);
                if (isMobile) setSidebarOpen(false);
              }}
              onNew={() => {
                startNewConversation();
                if (isMobile) setSidebarOpen(false);
              }}
              onDelete={deleteConversation}
            />
          </div>
        )}

        {/* Main chat area */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 p-3 border-b border-border">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
            </Button>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-sm font-semibold text-foreground">AI Study Helper</h1>
              <p className="text-[10px] text-muted-foreground">Ask any exam-related question</p>
            </div>
            {dailyRemaining !== null && (
              <Badge variant={limitExhausted ? 'destructive' : 'secondary'} className="text-[10px] shrink-0">
                {limitExhausted ? 'Limit reached' : `${dailyRemaining}/${dailyLimit} left today`}
              </Badge>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Namaste! 👋 Main aapka AI Study Helper hoon</p>
                  <p className="text-xs text-muted-foreground mt-1">Exam se related koi bhi sawaal poochein</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md mt-2">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      disabled={limitExhausted}
                      className="text-left text-xs px-3 py-2 rounded-lg border border-border bg-secondary/50 hover:bg-secondary text-foreground transition-colors disabled:opacity-50"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex gap-2 justify-start">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-secondary rounded-xl px-3.5 py-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex gap-2 p-3 border-t border-border">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={limitExhausted ? 'Daily limit reached — try again tomorrow' : 'Apna sawaal yahan likhein...'}
              disabled={isLoading || limitExhausted}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !input.trim() || limitExhausted} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
