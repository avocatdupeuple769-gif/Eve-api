import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { Message } from "@/context/EVEContext";

interface Props {
  message: Message;
}

export function MessageBubble({ message }: Props) {
  const colors = useColors();
  const isUser = message.role === "user";

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      {!isUser && (
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>E</Text>
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser
            ? [styles.userBubble, { backgroundColor: colors.primary }]
            : [styles.assistantBubble, { backgroundColor: colors.card, borderColor: colors.border }],
        ]}
      >
        <Text
          style={[
            styles.text,
            { color: isUser ? colors.primaryForeground : colors.foreground },
          ]}
        >
          {message.content}
        </Text>
      </View>
    </View>
  );
}

export function StreamingBubble({ content }: { content: string }) {
  const colors = useColors();
  return (
    <View style={[styles.row, styles.rowAssistant]}>
      <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
        <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>E</Text>
      </View>
      <View style={[styles.bubble, styles.assistantBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.text, { color: colors.foreground }]}>
          {content || "●●●"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginVertical: 4,
    paddingHorizontal: 16,
    alignItems: "flex-end",
    gap: 8,
  },
  rowUser: {
    justifyContent: "flex-end",
  },
  rowAssistant: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: "700",
  },
  bubble: {
    maxWidth: "75%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
});
