import React, { useEffect } from "react";
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useEVE } from "@/context/EVEContext";
import type { Conversation } from "@/context/EVEContext";

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

function ConversationItem({
  item,
  onPress,
  onDelete,
}: {
  item: Conversation;
  onPress: () => void;
  onDelete: () => void;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.itemContent}>
        <Text style={[styles.itemTitle, { color: colors.foreground }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>
          {formatDate(item.updatedAt)} · {item.language.toUpperCase()}
        </Text>
      </View>
      <TouchableOpacity
        onPress={onDelete}
        style={styles.deleteBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather name="trash-2" size={16} color={colors.mutedForeground} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function HistoryScreen() {
  const colors = useColors();
  const router = useRouter();
  const { conversations, loadConversations, deleteConversation, loadConversation } = useEVE();

  useEffect(() => {
    loadConversations();
  }, []);

  const handleDelete = (id: number) => {
    Alert.alert("Delete conversation?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteConversation(id),
      },
    ]);
  };

  const handleOpen = async (id: number) => {
    await loadConversation(id);
    router.back();
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {conversations.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="message-circle" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No conversations yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            Start talking to EVE to see your history here
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <ConversationItem
              item={item}
              onPress={() => handleOpen(item.id)}
              onDelete={() => handleDelete(item.id)}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { padding: 16 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  itemContent: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: "600", marginBottom: 3 },
  itemMeta: { fontSize: 12 },
  deleteBtn: { padding: 4 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 18, fontWeight: "600" },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
