import BackgroundService from "react-native-background-actions";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

const WAKE_WORDS = ["eve", "ève", "éve", "hey eve", "ok eve"];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function containsWakeWord(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return WAKE_WORDS.some((w) => lower.includes(w));
}

async function getDomain(): Promise<string> {
  return (await AsyncStorage.getItem("@eve:domain")) ?? "";
}

export const wakeWordBackgroundTask = async (_taskData: unknown): Promise<void> => {
  const domain = await getDomain();
  if (!domain) return;

  while (BackgroundService.isRunning()) {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync({
        android: {
          extension: ".m4a",
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 64000,
        },
        ios: {
          extension: ".m4a",
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.LOW,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 64000,
        },
        web: { mimeType: "audio/webm", bitsPerSecond: 64000 },
      });

      await rec.startAsync();
      await sleep(2500);

      if (!BackgroundService.isRunning()) {
        await rec.stopAndUnloadAsync();
        break;
      }

      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      if (!uri) { await sleep(200); continue; }

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      try { await FileSystem.deleteAsync(uri, { idempotent: true }); } catch {}

      const freshDomain = await getDomain();
      const response = await fetch(`https://${freshDomain}/api/openai/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: base64 }),
      });

      if (response.ok) {
        const data = (await response.json()) as { text?: string };
        if (data.text && containsWakeWord(data.text)) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "EVE",
              body: "Oui, je vous écoute ! Touchez pour parler.",
              data: { action: "wake" },
              sound: true,
            },
            trigger: null,
          });
          await BackgroundService.stop();
          return;
        }
      }

      await sleep(200);
    } catch {
      await sleep(1500);
    }
  }
};

export const BACKGROUND_OPTIONS = {
  taskName: "EVEWakeWord",
  taskTitle: "EVE · En écoute",
  taskDesc: "Dites 'Eve' pour activer l'assistante",
  taskIcon: { name: "ic_launcher", type: "mipmap" as const },
  color: "#C5A028",
  linkingURI: "eve-mobile://",
  parameters: {},
};

export async function startBackgroundWakeWord(domain: string): Promise<void> {
  if (BackgroundService.isRunning()) return;
  await AsyncStorage.setItem("@eve:domain", domain);
  await BackgroundService.start(wakeWordBackgroundTask, BACKGROUND_OPTIONS);
}

export async function stopBackgroundWakeWord(): Promise<void> {
  if (BackgroundService.isRunning()) {
    await BackgroundService.stop();
  }
}

export function isBackgroundWakeWordRunning(): boolean {
  return BackgroundService.isRunning();
}
