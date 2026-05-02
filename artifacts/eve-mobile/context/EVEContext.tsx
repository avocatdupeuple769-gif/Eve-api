import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { fetch } from "expo/fetch";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

export interface Conversation {
  id: number;
  title: string;
  language: string;
  createdAt: string;
  updatedAt: string;
}

type EVEState = {
  conversationId: number | null;
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;
  language: string;
  setLanguage: (lang: string) => void;
  sendTextMessage: (text: string) => Promise<void>;
  sendVoiceMessage: (base64audio: string) => Promise<void>;
  clearConversation: () => void;
  conversations: Conversation[];
  loadConversations: () => Promise<void>;
  deleteConversation: (id: number) => Promise<void>;
  loadConversation: (id: number) => Promise<void>;
  domain: string;
};

const EVEContext = createContext<EVEState | null>(null);

export function EVEProvider({ children }: { children: React.ReactNode }) {
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [language, setLanguageState] = useState("fr");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const domain = process.env.EXPO_PUBLIC_DOMAIN ?? "";

  useEffect(() => {
    AsyncStorage.getItem("@eve:language").then((v) => {
      if (v) setLanguageState(v);
    });
  }, []);

  const setLanguage = useCallback((lang: string) => {
    setLanguageState(lang);
    AsyncStorage.setItem("@eve:language", lang);
  }, []);

  const ensureConversation = useCallback(async (): Promise<number> => {
    if (conversationId) return conversationId;
    const resp = await fetch(`https://${domain}/api/openai/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "EVE Chat", language }),
    });
    const data = (await resp.json()) as { id: number };
    setConversationId(data.id);
    return data.id;
  }, [conversationId, domain, language]);

  const sendTextMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;
    const convId = await ensureConversation();
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text, createdAt: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);
    setStreamingContent("");

    try {
      const resp = await fetch(`https://${domain}/api/openai/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, language }),
      });
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value, { stream: true }).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6)) as { content?: string; done?: boolean };
            if (parsed.content) { accumulated += parsed.content; setStreamingContent(accumulated); }
            if (parsed.done) {
              setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: accumulated, createdAt: new Date() }]);
              setStreamingContent("");
            }
          } catch {}
        }
      }
    } catch (err) {
      console.error("sendTextMessage error:", err);
    } finally {
      setIsStreaming(false);
    }
  }, [isStreaming, ensureConversation, domain, language]);

  const sendVoiceMessage = useCallback(async (base64audio: string) => {
    if (isStreaming) return;
    const convId = await ensureConversation();
    setIsStreaming(true);
    setStreamingContent("");

    try {
      const resp = await fetch(`https://${domain}/api/openai/conversations/${convId}/voice-messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: base64audio, language }),
      });
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value, { stream: true }).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6)) as { type?: string; delta?: string; transcript?: string; done?: boolean };
            if (parsed.type === "input_audio_transcription.completed" && parsed.transcript) {
              setMessages((prev) => [...prev, { id: Date.now().toString(), role: "user", content: parsed.transcript!, createdAt: new Date() }]);
            }
            if (parsed.type === "transcript.text.delta" && parsed.delta) {
              assistantText += parsed.delta;
              setStreamingContent(assistantText);
            }
            if (parsed.done && assistantText) {
              setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: assistantText, createdAt: new Date() }]);
              setStreamingContent("");
            }
          } catch {}
        }
      }
    } catch (err) {
      console.error("sendVoiceMessage error:", err);
    } finally {
      setIsStreaming(false);
    }
  }, [isStreaming, ensureConversation, domain, language]);

  const clearConversation = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setStreamingContent("");
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const resp = await fetch(`https://${domain}/api/openai/conversations`);
      setConversations((await resp.json()) as Conversation[]);
    } catch {}
  }, [domain]);

  const deleteConversation = useCallback(async (id: number) => {
    try {
      await fetch(`https://${domain}/api/openai/conversations/${id}`, { method: "DELETE" });
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (conversationId === id) clearConversation();
    } catch {}
  }, [domain, conversationId, clearConversation]);

  const loadConversation = useCallback(async (id: number) => {
    try {
      const resp = await fetch(`https://${domain}/api/openai/conversations/${id}`);
      const data = (await resp.json()) as { id: number; messages: Array<{ id: number; role: string; content: string; createdAt: string }> };
      setConversationId(data.id);
      setMessages(data.messages.map((m) => ({ id: m.id.toString(), role: m.role as "user" | "assistant", content: m.content, createdAt: new Date(m.createdAt) })));
    } catch {}
  }, [domain]);

  return (
    <EVEContext.Provider value={{ conversationId, messages, isStreaming, streamingContent, language, setLanguage, sendTextMessage, sendVoiceMessage, clearConversation, conversations, loadConversations, deleteConversation, loadConversation, domain }}>
      {children}
    </EVEContext.Provider>
  );
}

export function useEVE() {
  const ctx = useContext(EVEContext);
  if (!ctx) throw new Error("useEVE must be used within EVEProvider");
  return ctx;
}

export const LANGUAGE_OPTIONS = [
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "sw", label: "Kiswahili", flag: "🇰🇪" },
  { code: "fan", label: "Fang", flag: "🇬🇦" },
];

export function getTTSLanguage(lang: string): string {
  const map: Record<string, string> = {
    fr: "fr-FR", en: "en-US", es: "es-ES", pt: "pt-BR",
    ar: "ar-SA", zh: "zh-CN", ja: "ja-JP", sw: "sw-KE", fan: "fr-FR",
  };
  return map[lang] ?? "fr-FR";
}
