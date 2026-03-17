import { MessageSquarePlus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ChatSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export default function ChatSidebar({
  conversations,
  activeConversationId,
  loading,
  onSelect,
  onNew,
  onDelete,
}: ChatSidebarProps) {
  return (
    <div className="flex flex-col h-full border-r border-border bg-muted/30">
      <div className="p-3 border-b border-border">
        <Button onClick={onNew} variant="outline" size="sm" className="w-full gap-2">
          <MessageSquarePlus className="h-4 w-4" />
          New Chat
        </Button>
      </div>
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : conversations.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8 px-3">No past chats yet</p>
        ) : (
          <div className="p-2 space-y-1">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={cn(
                  'group flex items-center gap-1 rounded-md px-2.5 py-2 text-xs cursor-pointer transition-colors',
                  activeConversationId === conv.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
                onClick={() => onSelect(conv.id)}
              >
                <span className="flex-1 truncate">{conv.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(conv.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive transition-opacity"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
