import { useState, useEffect, useRef } from "react";
import { Shell } from "@/components/layout/shell";
import { ChatInput } from "@/components/chat/chat-input";
import { MessageBubble } from "@/components/chat/message-bubble";
import { EveMask } from "@/components/chat/eve-mask";
import { usePreferences } from "@/hooks/use-preferences";
import {
  useCreateOpenaiConversation,
  useGetOpenaiConversation,
  OpenaiMessage,
  getGetOpenaiConversationQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVoiceRecorder, useVoiceStream } from "@workspace/integrations-openai-ai-react/audio";
import { motion, AnimatePresence } from "framer-motion";
import { Search } from "lucide-react";

const LANGUAGES = [
  "English", "French", "Spanish", "Portuguese", 
  "Arabic", "Chinese", "Japanese", "Swahili", "Fang"
];

export default function ChatPage() {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { preferences, updatePreferences } = usePreferences();
  
  const [conversationId, setConversationId] = useState<number | null>(() => {
    const active = sessionStorage.getItem("eve-active-conv");
    return active ? parseInt(active, 10) : null;
  });
  const [messages, setMessages] = useState<OpenaiMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const createConversation = useCreateOpenaiConversation();
  const { data: conversation, refetch } = useGetOpenaiConversation(conversationId!, {
    query: {
      enabled: !!conversationId,
      queryKey: getGetOpenaiConversationQueryKey(conversationId!)
    }
  });

  useEffect(() => {
    if (conversation?.messages) {
      setMessages(conversation.messages);
    }
  }, [conversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent, isSearching]);

  const handleSend = async (content: string) => {
    setIsStreaming(true);
    let currentConvId = conversationId;

    // Create new conversation if needed
    if (!currentConvId) {
      try {
        const newConv = await createConversation.mutateAsync({
          data: { title: content.slice(0, 30) || "New Chat", language: preferences.language }
        });
        currentConvId = newConv.id;
        setConversationId(newConv.id);
      } catch (e) {
        console.error("Failed to create conversation", e);
        setIsStreaming(false);
        return;
      }
    }

    // Add user message to local state immediately
    const tempUserMsg: OpenaiMessage = {
      id: Date.now(),
      conversationId: currentConvId,
      role: "user",
      content,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);
    
    // Simulate searching (you'd hook this to real search detection in a real app)
    if (content.toLowerCase().includes("search") || content.toLowerCase().includes("find")) {
      setIsSearching(true);
    }

    try {
      const response = await fetch(`/api/openai/conversations/${currentConvId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, language: preferences.language })
      });

      if (!response.ok) throw new Error("Failed to send message");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      let fullContent = "";
      setIsSearching(false);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  fullContent += data.content;
                  setStreamingContent(fullContent);
                }
              } catch (e) {
                // ignore parse errors for incomplete chunks
              }
            }
          }
        }
      }

      // Refresh to get finalized messages from DB
      await refetch();
      setStreamingContent("");
    } catch (e) {
      console.error("Stream error", e);
    } finally {
      setIsStreaming(false);
      setIsSearching(false);
    }
  };

  // Voice setup
  const [isRecording, setIsRecording] = useState(false);
  const recorder = useVoiceRecorder();
  
  // Worklet path resolution
  const workletPath = import.meta.env.BASE_URL + "audio-playback-worklet.js";
  const stream = useVoiceStream({
    workletPath,
    onTranscript: (_, full) => {
      if (full) {
        setStreamingContent(full);
      }
    }
  });

  const handleVoiceStart = async () => {
    try {
      await recorder.startRecording();
      setIsRecording(true);
    } catch (e) {
      console.error("Failed to start recording", e);
    }
  };

  const handleVoiceStop = async () => {
    setIsRecording(false);
    try {
      const { blob } = await recorder.stopRecording();
      
      let currentConvId = conversationId;
      if (!currentConvId) {
        const newConv = await createConversation.mutateAsync({
          data: { title: "Voice Note", language: preferences.language }
        });
        currentConvId = newConv.id;
        setConversationId(newConv.id);
      }

      setIsStreaming(true);
      await stream.streamVoiceResponse(`/api/openai/conversations/${currentConvId}/voice-messages`, blob);
      await refetch();
      setStreamingContent("");
      setIsStreaming(false);
    } catch (e) {
      console.error("Voice processing error", e);
      setIsStreaming(false);
    }
  };


  return (
    <Shell>
      <div className="flex h-full flex-col items-center justify-center p-4">
        
        {/* Header / Config */}
        <div className="w-full max-w-4xl flex items-center justify-between pb-6">
          <Select 
            value={preferences.language} 
            onValueChange={(val) => updatePreferences({ language: val })}
          >
            <SelectTrigger className="w-[140px] bg-card border-border text-foreground hover:bg-card/80 transition-colors">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map(lang => (
                <SelectItem key={lang} value={lang}>{lang}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Chat Area */}
        <div className="flex-1 w-full max-w-4xl overflow-y-auto rounded-3xl pb-20 scrollbar-hide relative">
          {messages.length === 0 && !isStreaming && !isSearching && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-60">
              <EveMask className="h-40 w-40 mb-8 opacity-40" />
              <h1 className="text-3xl font-serif text-muted-foreground tracking-widest uppercase">E V E</h1>
              <p className="mt-2 text-sm text-muted-foreground/50 font-mono tracking-widest">AWAITING INSTRUCTION</p>
            </div>
          )}

          <div className="flex flex-col p-4">
            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            <AnimatePresence>
              {isSearching && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center gap-3 text-muted-foreground text-sm font-mono mb-6 ml-14"
                >
                  <Search className="h-4 w-4 animate-pulse text-primary" />
                  <span>Searching the ether...</span>
                </motion.div>
              )}
              
              {isStreaming && streamingContent && (
                <MessageBubble 
                  message={{ 
                    id: 0, 
                    conversationId: conversationId || 0, 
                    role: "assistant", 
                    content: streamingContent, 
                    createdAt: new Date().toISOString() 
                  }} 
                />
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="w-full max-w-4xl fixed bottom-8 px-4 flex justify-center z-50">
          <ChatInput 
            onSend={handleSend}
            isStreaming={isStreaming}
            onVoiceStart={handleVoiceStart}
            onVoiceStop={handleVoiceStop}
            isRecording={isRecording}
          />
        </div>
      </div>
    </Shell>
  );
}
