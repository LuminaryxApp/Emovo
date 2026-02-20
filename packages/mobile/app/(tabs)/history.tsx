import type { MoodEntry } from "@emovo/shared";
import { useEffect, useCallback } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { MoodEntryCard } from "../../src/components/mood/MoodEntryCard";
import { useMoodStore } from "../../src/stores/mood.store";
import { colors } from "../../src/theme/colors";
import { spacing } from "../../src/theme/spacing";

export default function HistoryScreen() {
  const entries = useMoodStore((s) => s.entries);
  const isLoading = useMoodStore((s) => s.isLoadingEntries);
  const nextCursor = useMoodStore((s) => s.nextCursor);
  const fetchEntries = useMoodStore((s) => s.fetchEntries);
  const fetchMoreEntries = useMoodStore((s) => s.fetchMoreEntries);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleRefresh = useCallback(() => {
    fetchEntries(true);
  }, [fetchEntries]);

  const handleEndReached = useCallback(() => {
    if (nextCursor && !isLoading) {
      fetchMoreEntries();
    }
  }, [nextCursor, isLoading, fetchMoreEntries]);

  const renderItem = useCallback(({ item }: { item: MoodEntry }) => {
    return <MoodEntryCard entry={item} />;
  }, []);

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>🌿</Text>
        <Text style={styles.emptyTitle}>Your journal awaits</Text>
        <Text style={styles.emptySubtitle}>
          Once you log your first mood, your entries will appear here. Take a moment to check in
          with yourself.
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!isLoading || entries.length === 0) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  const renderSeparator = () => <View style={styles.separator} />;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.inner}>
        <Text style={styles.title}>History</Text>
        <FlatList
          data={entries}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          ItemSeparatorComponent={renderSeparator}
          refreshControl={
            <RefreshControl
              refreshing={isLoading && entries.length > 0}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontFamily: "SourceSerif4_700Bold",
    color: colors.text,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  separator: {
    height: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.xxl * 2,
    paddingHorizontal: spacing.xl,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 15,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 22,
  },
  footer: {
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
});
