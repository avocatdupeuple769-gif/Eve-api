import { motion } from "framer-motion";
import type { OpenaiMessage } from "@workspace/api-client-react";
import { format } from "date-fns";
import { EveMask } from "./eve-mask";

interface MessageBubbleProps {
  message: OpenaiMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isEve = message.role === "assistant";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`flex w-full gap-4 ${isEve ? "justify-start" : "justify-end"} mb-6`}
      data-testid={`message-bubble-${message.role}`}
    >
      {isEve && (
        <div className="mt-1 flex-shrink-0">
          <EveMask className="h-8 w-8" />
        </div>
      )}
      
      <div
        className={`relative max-w-[80%] rounded-2xl px-6 py-4 text-base leading-relaxed ${
          isEve
            ? "bg-card border border-border text-card-foreground shadow-sm rounded-tl-sm"
            : "bg-primary/10 border border-primary/20 text-foreground rounded-tr-sm"
        }`}
      >
        <div className="whitespace-pre-wrap font-sans">{message.content}</div>
        
        {message.createdAt && (
          <div 
            className={`mt-2 text-xs font-mono opacity-50 ${isEve ? "text-left" : "text-right"}`}
          >
            {format(new Date(message.createdAt), "HH:mm")}
          </div>
        )}
      </div>
    </motion.div>
  );
}
