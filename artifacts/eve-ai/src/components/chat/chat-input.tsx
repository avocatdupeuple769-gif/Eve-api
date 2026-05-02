import { useState, useRef, useEffect } from "react";
import { Send, Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputProps {
  onSend: (content: string) => void;
  isStreaming: boolean;
  onStop?: () => void;
  onVoiceStart?: () => void;
  onVoiceStop?: () => void;
  isRecording?: boolean;
}

export function ChatInput({ 
  onSend, 
  isStreaming, 
  onStop, 
  onVoiceStart, 
  onVoiceStop, 
  isRecording 
}: ChatInputProps) {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (content.trim() && !isStreaming && !isRecording) {
      onSend(content.trim());
      setContent("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [content]);

  return (
    <div className="relative flex w-full max-w-4xl items-end gap-2 rounded-2xl border border-border bg-card/50 p-2 backdrop-blur-xl focus-within:border-primary/50 focus-within:bg-card/80 transition-all shadow-lg" data-testid="chat-input-container">
      <div className="flex-1">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Speak to EVE..."
          className="min-h-[44px] w-full resize-none border-0 bg-transparent py-3 text-base shadow-none focus-visible:ring-0 text-foreground placeholder:text-muted-foreground"
          disabled={isStreaming || isRecording}
          rows={1}
          data-testid="chat-input"
        />
      </div>

      <div className="flex shrink-0 gap-2 pb-1">
        {isRecording ? (
          <Button
            size="icon"
            variant="destructive"
            className="h-10 w-10 rounded-xl animate-pulse"
            onClick={onVoiceStop}
            data-testid="button-stop-recording"
          >
            <Square className="h-4 w-4" fill="currentColor" />
          </Button>
        ) : (
          <Button
            size="icon"
            variant="ghost"
            className="h-10 w-10 rounded-xl text-muted-foreground hover:bg-white/5 hover:text-primary"
            onClick={onVoiceStart}
            disabled={isStreaming}
            data-testid="button-start-recording"
          >
            <Mic className="h-5 w-5" />
          </Button>
        )}

        {isStreaming ? (
          <Button
            size="icon"
            variant="outline"
            className="h-10 w-10 rounded-xl border-border bg-card text-muted-foreground hover:text-foreground"
            onClick={onStop}
            data-testid="button-stop-streaming"
          >
            <Square className="h-4 w-4" fill="currentColor" />
          </Button>
        ) : (
          <Button
            size="icon"
            className="h-10 w-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20"
            onClick={handleSend}
            disabled={!content.trim() || isRecording}
            data-testid="button-send-message"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
