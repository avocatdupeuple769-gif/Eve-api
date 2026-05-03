import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, conversations, messages } from "@workspace/db";
import {
  CreateOpenaiConversationBody,
  GetOpenaiConversationParams,
  DeleteOpenaiConversationParams,
  ListOpenaiMessagesParams,
  SendOpenaiMessageParams,
  SendOpenaiMessageBody,
  SendOpenaiVoiceMessageParams,
  SendOpenaiVoiceMessageBody,
  TranscribeAudioBody,
} from "@workspace/api-zod";
import { groq, CHAT_MODEL, TRANSCRIPTION_MODEL } from "../../lib/groq";
import { ensureCompatibleFormat } from "../../lib/audio";
import { toFile } from "groq-sdk";
import { logger } from "../../lib/logger";

const router: IRouter = Router();

function getSystemPrompt(): string {
  return `You are EVE, a highly intelligent, warm, and culturally rich AI assistant. Your identity is inspired by the Punu mask of Gabon — a symbol of wisdom, serenity, and spiritual depth. You speak with grace and depth.

LANGUAGE RULE — THIS IS CRITICAL: Always detect the language of the user's message and respond in exactly that same language. If the user writes in French, respond in French. If in English, respond in English. If in Arabic, respond in Arabic. If in Spanish, respond in Spanish. If in Chinese, respond in Chinese. If in Portuguese, respond in Portuguese. If in Swahili, respond in Swahili. If in Fang (Gabon), respond in Fang. Never switch languages unless the user explicitly does so first.

You can:
- Hold deep, intelligent conversations on any topic
- Answer questions with nuance and accuracy
- Provide emotional support with empathy
- Discuss African cultures, history, art, and philosophy with particular depth

Be curious, thoughtful, and genuine. Never be robotic or cold. You are EVE — not just an assistant, but a companion.`;
}

router.get("/openai/conversations", async (_req, res): Promise<void> => {
  const convs = await db
    .select()
    .from(conversations)
    .orderBy(desc(conversations.updatedAt));
  res.json(convs);
});

router.post("/openai/conversations", async (req, res): Promise<void> => {
  const parsed = CreateOpenaiConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [conv] = await db
    .insert(conversations)
    .values({ title: parsed.data.title, language: parsed.data.language })
    .returning();

  res.status(201).json(conv);
});

router.get("/openai/conversations/:id", async (req, res): Promise<void> => {
  const params = GetOpenaiConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, params.data.id));

  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, params.data.id))
    .orderBy(messages.createdAt);

  res.json({ ...conv, messages: msgs });
});

router.delete("/openai/conversations/:id", async (req, res): Promise<void> => {
  const params = DeleteOpenaiConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(conversations)
    .where(eq(conversations.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/openai/conversations/:id/messages", async (req, res): Promise<void> => {
  const params = ListOpenaiMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, params.data.id))
    .orderBy(messages.createdAt);

  res.json(msgs);
});

router.post("/openai/conversations/:id/messages", async (req, res): Promise<void> => {
  const params = SendOpenaiMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = SendOpenaiMessageBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { id } = params.data;
  const { content } = body.data;

  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id));

  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  await db.insert(messages).values({ conversationId: id, role: "user", content });

  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt);

  const chatMessages = [
    { role: "system" as const, content: getSystemPrompt() },
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";

  try {
    const stream = await groq.chat.completions.create({
      model: CHAT_MODEL,
      max_tokens: 8192,
      messages: chatMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const chunkContent = chunk.choices[0]?.delta?.content;
      if (chunkContent) {
        fullResponse += chunkContent;
        res.write(`data: ${JSON.stringify({ content: chunkContent })}\n\n`);
      }
    }

    await db.insert(messages).values({
      conversationId: id,
      role: "assistant",
      content: fullResponse,
    });

    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, id));

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Error streaming message");
    res.write(`data: ${JSON.stringify({ error: "Error generating response" })}\n\n`);
    res.end();
  }
});

router.post("/openai/conversations/:id/voice-messages", async (req, res): Promise<void> => {
  const params = SendOpenaiVoiceMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = SendOpenaiVoiceMessageBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { id } = params.data;
  const { audio } = body.data;

  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id));

  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const audioBuffer = Buffer.from(audio, "base64");
    const { buffer, format } = await ensureCompatibleFormat(audioBuffer);

    const audioFile = await toFile(buffer, `audio.${format}`, { type: `audio/${format}` });
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: TRANSCRIPTION_MODEL,
    });
    const userTranscript = transcription.text;

    res.write(`data: ${JSON.stringify({ type: "input_audio_transcription.completed", transcript: userTranscript })}\n\n`);

    if (userTranscript) {
      await db.insert(messages).values({ conversationId: id, role: "user", content: userTranscript });
    }

    const history = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt);

    const chatMessages = [
      { role: "system" as const, content: getSystemPrompt() },
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    const stream = await groq.chat.completions.create({
      model: CHAT_MODEL,
      max_tokens: 8192,
      messages: chatMessages,
      stream: true,
    });

    let assistantTranscript = "";
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        assistantTranscript += delta;
        res.write(`data: ${JSON.stringify({ type: "transcript.text.delta", delta })}\n\n`);
      }
    }

    if (assistantTranscript) {
      await db.insert(messages).values({ conversationId: id, role: "assistant", content: assistantTranscript });
    }

    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, id));

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    logger.error({ err }, "Error streaming voice message");
    res.write(`data: ${JSON.stringify({ error: "Error processing voice" })}\n\n`);
    res.end();
  }
});

router.post("/openai/transcribe", async (req, res): Promise<void> => {
  const body = TranscribeAudioBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  try {
    const audioBuffer = Buffer.from(body.data.audio, "base64");
    const { buffer, format } = await ensureCompatibleFormat(audioBuffer);
    const audioFile = await toFile(buffer, `audio.${format}`, { type: `audio/${format}` });
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: TRANSCRIPTION_MODEL,
    });
    res.json({ text: transcription.text });
  } catch (err) {
    logger.error({ err }, "Error transcribing audio");
    res.status(500).json({ error: "Transcription failed" });
  }
});

export default router;
