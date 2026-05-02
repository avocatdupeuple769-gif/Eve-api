import { Shell } from "@/components/layout/shell";
import { useListOpenaiConversations, useDeleteOpenaiConversation, getListOpenaiConversationsQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { Trash2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

export default function HistoryPage() {
  const { data: conversations, isLoading } = useListOpenaiConversations();
  const deleteMutation = useDeleteOpenaiConversation();
  const queryClient = useQueryClient();

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigating to the conversation
    if (confirm("Are you sure you want to forget this conversation?")) {
      await deleteMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
    }
  };

  return (
    <Shell>
      <div className="flex h-full flex-col px-8 py-10 max-w-5xl mx-auto w-full">
        <h1 className="text-3xl font-serif text-foreground mb-8 tracking-wide">Archives</h1>
        
        <div className="flex-1 overflow-y-auto scrollbar-hide pr-4">
          {isLoading ? (
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 w-full bg-card/50 rounded-xl border border-border/50" />
              ))}
            </div>
          ) : conversations?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
              <p className="font-mono text-sm tracking-widest uppercase">No memories recorded</p>
            </div>
          ) : (
            <div className="space-y-3">
              {conversations?.map((conv) => (
                <Link key={conv.id} href={`/`} onClick={() => sessionStorage.setItem("eve-active-conv", conv.id.toString())}>
                  <div className="group relative flex items-center justify-between p-5 rounded-2xl border border-border bg-card/30 hover:bg-card/80 transition-all hover:shadow-md cursor-pointer data-[testid='conversation-card']">
                    <div className="flex flex-col gap-1">
                      <h3 className="text-lg font-medium text-card-foreground line-clamp-1">{conv.title || "Unknown Conversation"}</h3>
                      <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
                        <span className="text-primary/70">{conv.language}</span>
                        <span>•</span>
                        <span>{format(new Date(conv.updatedAt || conv.createdAt), "MMM d, yyyy HH:mm")}</span>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => handleDelete(conv.id, e)}
                      data-testid={`button-delete-conv-${conv.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
