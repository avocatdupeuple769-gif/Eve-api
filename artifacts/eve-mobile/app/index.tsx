import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Platform, Keyboard, ActivityIndicator,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import * as Notifications from "expo-notifications";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useEVE } from "@/context/EVEContext";
import { useWakeWord } from "@/hooks/useWakeWord";
import { PunuMaskLogo } from "@/components/PunuMaskLogo";
import { MessageBubble, StreamingBubble } from "@/components/MessageBubble";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowList: true,
  }),
});

function detectTTSLanguage(text: string): string {
  if (/[\u0600-\u06FF]/.test(text)) return "ar-SA";
  if (/[\u4E00-\u9FFF\u3400-\u4DBF]/.test(text)) return "zh-CN";
  if (/[\u3040-\u30FF]/.test(text)) return "ja-JP";
  if (/\b(que|una|los|las|por|con|para|como|pero|más|esto|hola|gracias)\b/i.test(text)) return "es-ES";
  if (/\b(que|uma|por|com|para|como|mas|mais|isso|não|obrigado|também)\b/i.test(text)) return "pt-BR";
  if (/\b(je|vous|nous|est|les|des|une|pour|avec|dans|sur|qui|que|bonjour|merci|oui|non)\b/i.test(text)) return "fr-FR";
  if (/\b(the|is|are|was|were|have|has|this|that|with|from|what|how)\b/i.test(text)) return "en-US";
  if (/\b(na|ya|wa|ni|kwa|katika|lakini|pia|sasa|hapa)\b/i.test(text)) return "sw-KE";
  return "fr-FR";
}

type VoiceState = "idle" | "recording" | "thinking";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    messages, isStreaming, streamingContent,
    sendTextMessage, sendVoiceMessage, clearConversation, domain,
  } = useEVE();

  const [inputText, setInputText] = useState("");
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const flatListRef = useRef<FlatList>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const prevMsgCount = useRef(0);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const onWakeWord = useCallback(() => {
    Speech.speak("Oui.", { language: "fr-FR", rate: 0.95 });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const { isForegroundActive, requestPermission, startForeground, stopAll } = useWakeWord(domain, onWakeWord);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const initEVE = async () => {
      await Notifications.requestPermissionsAsync();
      const granted = await requestPermission();
      if (granted) await startForeground();
    };
    initEVE();
    return () => { stopAll(); };
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      if (response.notification.request.content.data?.action === "wake") {
        startForeground();
      }
    });
    return () => sub.remove();
  }, [startForeground]);

  useEffect(() => {
    if (messages.length > prevMsgCount.current) {
      prevMsgCount.current = messages.length;
      const last = messages[messages.length - 1];
      if (last?.role === "assistant") {
        const ttsLang = detectTTSLanguage(last.content);
        Speech.stop();
        Speech.speak(last.content.slice(0, 400), {
          language: ttsLang,
          rate: 0.92,
          pitch: 1.0,
          onDone: () => { startForeground(); },
        });
      }
    }
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    if (!inputText.trim()) return;
    stopAll();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const text = inputText.trim();
    setInputText("");
    Keyboard.dismiss();
    setVoiceState("thinking");
    await sendTextMessage(text);
    setVoiceState("idle");
    startForeground();
  }, [inputText, sendTextMessage, stopAll, startForeground]);

  const startVoiceRecording = useCallback(async () => {
    if (recordingRef.current) return;
    stopAll();
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync({
        android: { extension: ".m4a", outputFormat: Audio.AndroidOutputFormat.MPEG_4, audioEncoder: Audio.AndroidAudioEncoder.AAC, sampleRate: 16000, numberOfChannels: 1, bitRate: 128000 },
        ios: { extension: ".m4a", outputFormat: Audio.IOSOutputFormat.MPEG4AAC, audioQuality: Audio.IOSAudioQuality.HIGH, sampleRate: 16000, numberOfChannels: 1, bitRate: 128000 },
        web: { mimeType: "audio/webm", bitsPerSecond: 128000 },
      });
      recordingRef.current = rec;
      await rec.startAsync();
      setVoiceState("recording");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err) {
      console.error("Recording error:", err);
    }
  }, [stopAll]);

  const stopVoiceRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setVoiceState("thinking");
      if (uri) {
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" as any });
        try { await FileSystem.deleteAsync(uri, { idempotent: true }); } catch {}
        await sendVoiceMessage(base64);
      }
    } catch (err) {
      console.error("Stop recording error:", err);
      recordingRef.current = null;
    }
    setVoiceState("idle");
    startForeground();
  }, [sendVoiceMessage, startForeground]);

  const isThinking = voiceState === "thinking" || isStreaming;
  const isRecording = voiceState === "recording";
  const showStreaming = isStreaming && streamingContent !== "";

  const statusLabel = isRecording
    ? "ENREGISTREMENT..."
    : isThinking
    ? "EVE RÉFLÉCHIT..."
    : isForegroundActive
    ? "EN ÉCOUTE · \"EVE\""
    : "EN ATTENTE";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={() => router.push("/history")} style={styles.iconBtn} activeOpacity={0.7}>
          <Feather name="clock" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/settings")} style={styles.iconBtn} activeOpacity={0.7}>
          <Feather name="settings" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {messages.length === 0 && (
        <View style={styles.heroArea}>
          <PunuMaskLogo
            size={120}
            isListening={isForegroundActive || isRecording}
            isThinking={isThinking}
            isActive={isForegroundActive || isRecording || isThinking}
          />
          <Text style={[styles.eveName, { color: colors.primary }]}>E V E</Text>
          <Text style={[styles.statusLabel, { color: colors.mutedForeground }]}>{statusLabel}</Text>
        </View>
      )}

      {messages.length > 0 && (
        <View style={[styles.compactHeader, { borderBottomColor: colors.border }]}>
          <PunuMaskLogo size={36} isListening={isForegroundActive} isThinking={isThinking} isActive={isForegroundActive || isThinking} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.eveNameSmall, { color: colors.primary }]}>E V E</Text>
            <Text style={[styles.statusSmall, { color: colors.mutedForeground }]}>{statusLabel}</Text>
          </View>
          <TouchableOpacity onPress={clearConversation} style={[styles.newChatBtn, { borderColor: colors.border }]} activeOpacity={0.7}>
            <Feather name="plus" size={15} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        {messages.length > 0 && (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <MessageBubble message={item} />}
            ListFooterComponent={showStreaming ? <StreamingBubble content={streamingContent} /> : null}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: bottomPad + 8 }]}>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
            placeholder="Écrire à EVE..."
            placeholderTextColor={colors.mutedForeground}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            multiline={false}
          />
          {isThinking ? (
            <View style={[styles.actionBtn, { backgroundColor: colors.secondary }]}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : inputText.trim().length > 0 ? (
            <TouchableOpacity onPress={handleSend} style={[styles.actionBtn, { backgroundColor: colors.primary }]} activeOpacity={0.8}>
              <Feather name="send" size={16} color={colors.primaryForeground} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={isRecording ? stopVoiceRecording : startVoiceRecording}
              style={[styles.actionBtn, { backgroundColor: isRecording ? "#C0392B" : colors.primary }]}
              activeOpacity={0.8}
            >
              <Feather name={isRecording ? "square" : "mic"} size={16} color={colors.primaryForeground} />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", paddingHorizontal: 16, paddingBottom: 4, alignItems: "center" },
  iconBtn: { padding: 8 },
  heroArea: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 20, gap: 8 },
  eveName: { fontSize: 26, fontWeight: "700", letterSpacing: 10, fontFamily: "Inter_700Bold" },
  statusLabel: { fontSize: 10, letterSpacing: 3, fontFamily: "Inter_400Regular" },
  compactHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 10, borderBottomWidth: 1 },
  eveNameSmall: { fontSize: 13, fontWeight: "700", letterSpacing: 4, fontFamily: "Inter_700Bold" },
  statusSmall: { fontSize: 9, letterSpacing: 2, fontFamily: "Inter_400Regular" },
  newChatBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  messagesList: { paddingTop: 8, paddingBottom: 8 },
  inputBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 10, gap: 8, borderTopWidth: 1 },
  textInput: { flex: 1, height: 40, borderRadius: 20, paddingHorizontal: 14, fontSize: 15, borderWidth: 1, fontFamily: "Inter_400Regular" },
  actionBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
