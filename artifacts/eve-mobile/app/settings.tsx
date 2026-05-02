import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import { useColors } from "@/hooks/useColors";
import { useEVE } from "@/context/EVEContext";

function SectionTitle({ title }: { title: string }) {
  const colors = useColors();
  return <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title}</Text>;
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { clearConversation } = useEVE();

  const handleTestVoice = () => {
    Speech.stop();
    Speech.speak("Bonjour, je suis EVE. Comment puis-je vous aider ?", {
      language: "fr-FR",
      rate: 0.92,
    });
  };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
    >
      <SectionTitle title="VOIX" />
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity style={styles.row} onPress={handleTestVoice} activeOpacity={0.7}>
          <Text style={[styles.rowLabel, { color: colors.foreground }]}>Tester la voix d'EVE</Text>
          <View style={[styles.playBtn, { backgroundColor: colors.primary }]}>
            <Feather name="play" size={14} color={colors.primaryForeground} />
          </View>
        </TouchableOpacity>
      </View>

      <SectionTitle title="LANGUE" />
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.infoRow}>
          <Feather name="globe" size={16} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            EVE détecte automatiquement votre langue. Parlez ou écrivez en français, anglais, espagnol, arabe, ou toute autre langue — EVE répond dans la même langue.
          </Text>
        </View>
      </View>

      <SectionTitle title="CONVERSATION" />
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity style={styles.row} onPress={clearConversation} activeOpacity={0.7}>
          <Feather name="plus-circle" size={18} color={colors.mutedForeground} />
          <Text style={[styles.rowLabel, { color: colors.foreground, marginLeft: 12, flex: 1 }]}>
            Nouvelle conversation
          </Text>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <SectionTitle title="À PROPOS" />
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {[
          { label: "Version", value: "1.0.0" },
          { label: "Inspiré du", value: "Masque Punu · Gabon" },
          { label: "Langues", value: "Automatique · 9 langues" },
          { label: "IA", value: "GPT-5.4 · Whisper" },
        ].map((item, idx, arr) => (
          <View
            key={item.label}
            style={[
              styles.aboutRow,
              idx < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
            ]}
          >
            <Text style={[styles.aboutLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
            <Text style={[styles.aboutValue, { color: colors.foreground }]}>{item.value}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  sectionTitle: {
    fontSize: 11, letterSpacing: 2, fontWeight: "600",
    paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8,
  },
  section: { marginHorizontal: 16, borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  row: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 15,
  },
  rowLabel: { fontSize: 15 },
  infoRow: {
    flexDirection: "row", alignItems: "flex-start",
    gap: 12, padding: 16,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 20 },
  playBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
  },
  aboutRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 13,
  },
  aboutLabel: { fontSize: 14 },
  aboutValue: { fontSize: 14, fontWeight: "500" },
});
