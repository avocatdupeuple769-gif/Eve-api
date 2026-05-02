import React, { useState } from "react";
import {
  Modal, View, Text, TouchableOpacity, FlatList, StyleSheet, Pressable,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { LANGUAGE_OPTIONS } from "@/context/EVEContext";

interface Props {
  currentLanguage: string;
  onSelect: (code: string) => void;
}

export function LanguageSelector({ currentLanguage, onSelect }: Props) {
  const colors = useColors();
  const [visible, setVisible] = useState(false);
  const current = LANGUAGE_OPTIONS.find((l) => l.code === currentLanguage) ?? LANGUAGE_OPTIONS[0];

  return (
    <>
      <TouchableOpacity
        onPress={() => setVisible(true)}
        style={[styles.trigger, { backgroundColor: colors.secondary, borderColor: colors.border }]}
        activeOpacity={0.7}
      >
        <Text style={styles.flag}>{current!.flag}</Text>
        <Text style={[styles.code, { color: colors.mutedForeground }]}>{currentLanguage.toUpperCase()}</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.foreground }]}>Language</Text>
            <FlatList
              data={LANGUAGE_OPTIONS}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.option,
                    item.code === currentLanguage && { backgroundColor: colors.secondary },
                  ]}
                  onPress={() => {
                    onSelect(item.code);
                    setVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.flag}>{item.flag}</Text>
                  <Text style={[styles.optionLabel, { color: colors.foreground }]}>{item.label}</Text>
                  {item.code === currentLanguage && (
                    <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  flag: { fontSize: 16 },
  code: { fontSize: 12, fontWeight: "600" },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  sheet: {
    width: 280,
    maxHeight: 420,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    paddingTop: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: 8,
    opacity: 0.6,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  optionLabel: { fontSize: 15, flex: 1 },
  activeDot: { width: 6, height: 6, borderRadius: 3 },
});
