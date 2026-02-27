import type { Message } from "@emovo/shared";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ActionSheet } from "../../src/components/ui";
import type { ActionSheetItem } from "../../src/components/ui/ActionSheet";
import {
  listMessagesApi,
  sendMessageApi,
  markConversationReadApi,
  deleteMessageApi,
  submitReportApi,
} from "../../src/services/community.api";
import { useAuthStore } from "../../src/stores/auth.store";
import { useTheme } from "../../src/theme/ThemeContext";
import { spacing, radii, screenPadding } from "../../src/theme/spacing";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const time = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (diffDays === 0) return time;
  if (diffDays === 1) return `Yesterday ${time}`;
  if (diffDays < 7) {
    const day = date.toLocaleDateString(undefined, { weekday: "short" });
    return `${day} ${time}`;
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const REPORT_REASONS = [
  { key: "spam", label: "Spam", icon: "mail-outline" as const },
  { key: "harassment", label: "Harassment", icon: "hand-left-outline" as const },
  { key: "hate_speech", label: "Hate Speech", icon: "alert-outline" as const },
  { key: "self_harm", label: "Self-Harm Concern", icon: "heart-outline" as const },
  { key: "misinformation", label: "Misinformation", icon: "alert-circle-outline" as const },
  { key: "inappropriate", label: "Inappropriate Content", icon: "eye-off-outline" as const },
  { key: "other", label: "Other", icon: "ellipsis-horizontal-outline" as const },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ConversationScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const user = useAuthStore((s) => s.user);

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [inputText, setInputText] = useState("");

  // Action sheet state
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [reportSheetVisible, setReportSheetVisible] = useState(false);

  const flatListRef = useRef<FlatList<Message>>(null);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const loadMessages = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const result = await listMessagesApi(id, { limit: 30 });
      setMessages(result.messages);
      setCursor(result.cursor);
    } catch {
      // Silent fail — user sees empty state
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const loadOlderMessages = useCallback(async () => {
    if (!id || !cursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const result = await listMessagesApi(id, { cursor, limit: 30 });
      setMessages((prev) => [...prev, ...result.messages]);
      setCursor(result.cursor);
    } catch {
      // Silent fail
    } finally {
      setIsLoadingMore(false);
    }
  }, [id, cursor, isLoadingMore]);

  // Initial load + mark as read
  useEffect(() => {
    loadMessages();
    if (id) {
      markConversationReadApi(id).catch(() => {});
    }
  }, [id, loadMessages]);

  // ---------------------------------------------------------------------------
  // Send message
  // ---------------------------------------------------------------------------

  const handleSend = useCallback(async () => {
    const trimmed = inputText.trim();
    if (!trimmed || !id || isSending) return;

    setIsSending(true);
    setInputText("");

    try {
      const message = await sendMessageApi(id, { content: trimmed });
      setMessages((prev) => [message, ...prev]);
    } catch {
      // Restore text on failure so user can retry
      setInputText(trimmed);
    } finally {
      setIsSending(false);
    }
  }, [inputText, id, isSending]);

  // ---------------------------------------------------------------------------
  // Message actions
  // ---------------------------------------------------------------------------

  const handleDeleteMessage = useCallback(
    (message: Message) => {
      if (!id) return;
      Alert.alert("Delete Message?", "This message will be permanently deleted.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMessageApi(id, message.id);
              setMessages((prev) => prev.filter((m) => m.id !== message.id));
            } catch {
              Alert.alert("Error", "Failed to delete message.");
            }
          },
        },
      ]);
    },
    [id],
  );

  const handleLongPress = useCallback((message: Message) => {
    setSelectedMessage(message);
    setActionSheetVisible(true);
  }, []);

  const messageActions = useMemo((): ActionSheetItem[] => {
    if (!selectedMessage) return [];
    const isMine = selectedMessage.senderId === user?.id;
    const items: ActionSheetItem[] = [];

    if (isMine) {
      items.push({
        label: "Delete",
        icon: "trash-outline",
        destructive: true,
        onPress: () => handleDeleteMessage(selectedMessage),
      });
    } else {
      items.push({
        label: "Report",
        icon: "flag-outline",
        onPress: () => {
          setActionSheetVisible(false);
          setTimeout(() => setReportSheetVisible(true), 300);
        },
      });
    }

    return items;
  }, [selectedMessage, user?.id, handleDeleteMessage]);

  const reportActions = useMemo(
    (): ActionSheetItem[] =>
      REPORT_REASONS.map((r) => ({
        label: r.label,
        icon: r.icon,
        onPress: async () => {
          if (!selectedMessage) return;
          try {
            await submitReportApi({
              targetType: "message",
              targetId: selectedMessage.id,
              reason: r.key,
            });
            Alert.alert("Report Submitted", "Thank you. We will review this report.");
          } catch {
            Alert.alert("Error", "Failed to submit report.");
          }
          setSelectedMessage(null);
        },
      })),
    [selectedMessage],
  );

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const renderMessage = useCallback(
    ({ item, index }: { item: Message; index: number }) => {
      const isMine = item.senderId === user?.id;
      const isSystem = item.type === "system";

      // Show sender name for received messages when consecutive messages are from
      // different senders (or it's the last item in the inverted list = first chronologically)
      const nextItem = messages[index + 1];
      const showName = !isMine && !isSystem && nextItem?.senderId !== item.senderId;

      if (isSystem) {
        return (
          <View style={styles.systemMessageRow}>
            <Text style={[styles.systemMessageText, { color: colors.textTertiary }]}>
              {item.content}
            </Text>
          </View>
        );
      }

      return (
        <Pressable
          onLongPress={() => handleLongPress(item)}
          delayLongPress={400}
          style={[styles.messageRow, isMine ? styles.messageRowSent : styles.messageRowReceived]}
        >
          <View
            style={[
              styles.messageBubble,
              isMine
                ? [styles.messageBubbleSent, { backgroundColor: colors.primary }]
                : [styles.messageBubbleReceived, { backgroundColor: colors.inputBackground }],
            ]}
          >
            {showName && (
              <Text
                style={[
                  styles.messageSenderName,
                  { color: isMine ? "rgba(255,255,255,0.7)" : colors.primary },
                ]}
              >
                {item.senderName}
              </Text>
            )}
            <Text style={[styles.messageText, { color: isMine ? "#FFFFFF" : colors.text }]}>
              {item.content}
            </Text>
            <Text
              style={[
                styles.messageTimestamp,
                {
                  color: isMine ? "rgba(255,255,255,0.6)" : colors.textTertiary,
                },
              ]}
            >
              {formatMessageTime(item.createdAt)}
            </Text>
          </View>
        </Pressable>
      );
    },
    [user?.id, messages, colors, handleLongPress],
  );

  const keyExtractor = useCallback((item: Message) => item.id, []);

  const ListFooterComponent = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }, [isLoadingMore, colors.primary]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.screen, { backgroundColor: colors.background }]}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + spacing.xs,
            borderBottomColor: colors.borderLight,
            backgroundColor: colors.surface,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerName, { color: colors.text }]} numberOfLines={1}>
            {name || "Conversation"}
          </Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Messages */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="chatbubbles-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No messages yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
            Send the first message to start the conversation
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          inverted
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onEndReached={loadOlderMessages}
          onEndReachedThreshold={0.3}
          ListFooterComponent={ListFooterComponent}
        />
      )}

      {/* Input bar */}
      <View
        style={[
          styles.inputBar,
          {
            paddingBottom: insets.bottom + spacing.sm,
            borderTopColor: colors.borderLight,
            backgroundColor: colors.surface,
          },
        ]}
      >
        <TextInput
          style={[
            styles.textInput,
            {
              color: colors.text,
              backgroundColor: colors.inputBackground,
            },
          ]}
          placeholder="Type a message..."
          placeholderTextColor={colors.textTertiary}
          value={inputText}
          onChangeText={setInputText}
          maxLength={2000}
          multiline
          returnKeyType="default"
        />
        <Pressable
          onPress={handleSend}
          disabled={!inputText.trim() || isSending}
          style={[
            styles.sendButton,
            { backgroundColor: colors.primary },
            (!inputText.trim() || isSending) && styles.sendButtonDisabled,
          ]}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={18} color="#FFFFFF" />
          )}
        </Pressable>
      </View>

      {/* Message action sheet */}
      <ActionSheet
        visible={actionSheetVisible}
        onClose={() => {
          setActionSheetVisible(false);
          setSelectedMessage(null);
        }}
        actions={messageActions}
      />

      {/* Report reason picker */}
      <ActionSheet
        visible={reportSheetVisible}
        onClose={() => {
          setReportSheetVisible(false);
          setSelectedMessage(null);
        }}
        actions={reportActions}
        title="Why are you reporting this?"
      />
    </KeyboardAvoidingView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: screenPadding.horizontal,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  headerName: {
    fontSize: 17,
    fontFamily: "SourceSerif4_700Bold",
  },
  headerRight: {
    width: 40,
  },

  // Messages
  messageList: {
    paddingHorizontal: screenPadding.horizontal,
    paddingVertical: spacing.sm,
  },
  messageRow: {
    marginBottom: spacing.xs,
    maxWidth: "80%",
  },
  messageRowSent: {
    alignSelf: "flex-end",
  },
  messageRowReceived: {
    alignSelf: "flex-start",
  },
  messageBubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.lg,
  },
  messageBubbleSent: {
    borderBottomRightRadius: radii.sm,
  },
  messageBubbleReceived: {
    borderBottomLeftRadius: radii.sm,
  },
  messageSenderName: {
    fontSize: 12,
    fontFamily: "SourceSerif4_600SemiBold",
    marginBottom: 2,
  },
  messageText: {
    fontSize: 15,
    fontFamily: "SourceSerif4_400Regular",
    lineHeight: 21,
  },
  messageTimestamp: {
    fontSize: 11,
    fontFamily: "SourceSerif4_400Regular",
    marginTop: 4,
    alignSelf: "flex-end",
  },

  // System messages
  systemMessageRow: {
    alignItems: "center",
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  systemMessageText: {
    fontSize: 12,
    fontFamily: "SourceSerif4_400Regular",
    fontStyle: "italic",
    textAlign: "center",
  },

  // Loading
  loadingMore: {
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingHorizontal: screenPadding.horizontal,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "SourceSerif4_600SemiBold",
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
    textAlign: "center",
  },

  // Input bar
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: screenPadding.horizontal,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
