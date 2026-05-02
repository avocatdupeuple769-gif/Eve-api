import { useState, useRef, useCallback, useEffect } from "react";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import * as KeepAwake from "expo-keep-awake";
import { Platform, AppState, AppStateStatus } from "react-native";
import {
  startBackgroundWakeWord,
  stopBackgroundWakeWord,
  isBackgroundWakeWordRunning,
} from "@/services/backgroundWakeWord";

const RECORDING_DURATION_MS = 2500;
const WAKE_WORDS = ["eve", "ève", "éve", "hey eve", "ok eve"];

function containsWakeWord(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return WAKE_WORDS.some((w) => lower.includes(w));
}

export function useWakeWord(domain: string, onWakeWord: () => void) {
  const [isForegroundActive, setIsForegroundActive] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const loopActiveRef = useRef(false);
  const domainRef = useRef(domain);
  domainRef.current = domain;
  const onWakeWordRef = useRef(onWakeWord);
  onWakeWordRef.current = onWakeWord;

  const requestPermission = useCallback(async () => {
    if (Platform.OS === "web") { setHasPermission(false); return false; }
    const { granted } = await Audio.requestPermissionsAsync();
    setHasPermission(granted);
    return granted;
  }, []);

  const stopForegroundLoop = useCallback(async () => {
    loopActiveRef.current = false;
    setIsForegroundActive(false);
    if (recordingRef.current) {
      try { await recordingRef.current.stopAndUnloadAsync(); } catch {}
      recordingRef.current = null;
    }
    if (Platform.OS !== "web") KeepAwake.deactivateKeepAwake("eve-wake");
  }, []);

  const foregroundLoop = useCallback(async () => {
    if (!loopActiveRef.current) return;
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync({
        android: { extension: ".m4a", outputFormat: Audio.AndroidOutputFormat.MPEG_4, audioEncoder: Audio.AndroidAudioEncoder.AAC, sampleRate: 16000, numberOfChannels: 1, bitRate: 64000 },
        ios: { extension: ".m4a", outputFormat: Audio.IOSOutputFormat.MPEG4AAC, audioQuality: Audio.IOSAudioQuality.MEDIUM, sampleRate: 16000, numberOfChannels: 1, bitRate: 64000 },
        web: { mimeType: "audio/webm", bitsPerSecond: 64000 },
      });
      recordingRef.current = rec;
      await rec.startAsync();
      await new Promise((r) => setTimeout(r, RECORDING_DURATION_MS));
      if (!loopActiveRef.current) { await rec.stopAndUnloadAsync(); recordingRef.current = null; return; }
      await rec.stopAndUnloadAsync();
      recordingRef.current = null;
      const uri = rec.getURI();
      if (!uri) { if (loopActiveRef.current) setTimeout(foregroundLoop, 100); return; }
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" as any });
      try { await FileSystem.deleteAsync(uri, { idempotent: true }); } catch {}
      const response = await fetch(`https://${domainRef.current}/api/openai/transcribe`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: base64 }),
      });
      if (response.ok) {
        const data = (await response.json()) as { text?: string };
        if (data.text && containsWakeWord(data.text)) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          loopActiveRef.current = false;
          setIsForegroundActive(false);
          KeepAwake.deactivateKeepAwake("eve-wake");
          onWakeWordRef.current();
          return;
        }
      }
      if (loopActiveRef.current) setTimeout(foregroundLoop, 200);
    } catch {
      if (loopActiveRef.current) setTimeout(foregroundLoop, 1000);
    }
  }, [stopForegroundLoop]);

  const startForeground = useCallback(async () => {
    if (Platform.OS === "web") return;
    let granted = hasPermission;
    if (granted === null) granted = await requestPermission();
    if (!granted) return;
    await stopBackgroundWakeWord();
    loopActiveRef.current = true;
    setIsForegroundActive(true);
    await KeepAwake.activateKeepAwakeAsync("eve-wake");
    foregroundLoop();
  }, [hasPermission, requestPermission, foregroundLoop]);

  const startBackground = useCallback(async () => {
    if (Platform.OS !== "android") return;
    await stopForegroundLoop();
    await startBackgroundWakeWord(domainRef.current);
  }, [stopForegroundLoop]);

  const stopAll = useCallback(async () => {
    await stopForegroundLoop();
    await stopBackgroundWakeWord();
  }, [stopForegroundLoop]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const handleAppState = async (nextState: AppStateStatus) => {
      if (nextState === "active") {
        if (isBackgroundWakeWordRunning()) await stopBackgroundWakeWord();
        await startForeground();
      } else if (nextState === "background" || nextState === "inactive") {
        await stopForegroundLoop();
        await startBackground();
      }
    };
    const subscription = AppState.addEventListener("change", handleAppState);
    return () => { subscription.remove(); };
  }, [startForeground, startBackground, stopForegroundLoop]);

  useEffect(() => {
    return () => {
      loopActiveRef.current = false;
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }
      if (Platform.OS !== "web") KeepAwake.deactivateKeepAwake("eve-wake");
    };
  }, []);

  return {
    isForegroundActive,
    hasPermission,
    startForeground,
    startBackground,
    stopAll,
    requestPermission,
  };
}
