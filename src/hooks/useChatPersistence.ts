import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type Msg = { role: 'user' | 'assistant'; content: string };

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export function useChatPersistence() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);

  // Load conversation list
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    setConversations((data as Conversation[]) ?? []);
    setLoadingConversations(false);
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Load messages for a conversation
  const loadConversation = useCallback(async (conversationId: string) => {
    setActiveConversationId(conversationId);
    const { data } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    setMessages((data as Msg[]) ?? []);
  }, []);

  // Start a new conversation
  const startNewConversation = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
  }, []);

  // Persist a user message (creates conversation if needed)
  const persistUserMessage = useCallback(async (content: string): Promise<string> => {
    if (!user) throw new Error('Not authenticated');

    let convId = activeConversationId;
    if (!convId) {
      const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
      const { data, error } = await supabase
        .from('chat_conversations')
        .insert({ user_id: user.id, title })
        .select('id')
        .single();
      if (error || !data) throw error ?? new Error('Failed to create conversation');
      convId = data.id;
      setActiveConversationId(convId);
    } else {
      // Update the updated_at timestamp
      await supabase
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', convId);
    }

    await supabase
      .from('chat_messages')
      .insert({ conversation_id: convId, role: 'user', content });

    return convId;
  }, [user, activeConversationId]);

  // Persist assistant message
  const persistAssistantMessage = useCallback(async (conversationId: string, content: string) => {
    await supabase
      .from('chat_messages')
      .insert({ conversation_id: conversationId, role: 'assistant', content });
    // Refresh conversation list to update ordering
    await fetchConversations();
  }, [fetchConversations]);

  // Delete a conversation
  const deleteConversation = useCallback(async (conversationId: string) => {
    await supabase.from('chat_conversations').delete().eq('id', conversationId);
    if (activeConversationId === conversationId) {
      setActiveConversationId(null);
      setMessages([]);
    }
    await fetchConversations();
  }, [activeConversationId, fetchConversations]);

  return {
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
  };
}
