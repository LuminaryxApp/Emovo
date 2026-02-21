import { Ionicons } from "@expo/vector-icons";
import { Tabs, router } from "expo-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Platform, View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuthStore } from "../../src/stores/auth.store";
import { colors } from "../../src/theme/colors";

type TabIconName = "home" | "calendar" | "people" | "stats-chart" | "person";

function TabIcon({ name, label, focused }: { name: TabIconName; label: string; focused: boolean }) {
  const iconName = focused ? name : (`${name}-outline` as keyof typeof Ionicons.glyphMap);

  return (
    <View style={tabStyles.tabItem}>
      {focused && <View style={tabStyles.activeIndicator} />}
      <Ionicons name={iconName} size={24} color={focused ? colors.primary : colors.textTertiary} />
      <Text style={[tabStyles.label, focused && tabStyles.labelActive]}>{label}</Text>
    </View>
  );
}

const TAB_BAR_HEIGHT = 64;
const TAB_BAR_PADDING_TOP = 8;

export default function TabsLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const barHeight = TAB_BAR_HEIGHT + TAB_BAR_PADDING_TOP + insets.bottom;

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/(auth)/login");
    }
  }, [isAuthenticated]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: barHeight,
          paddingTop: TAB_BAR_PADDING_TOP,
          paddingBottom: insets.bottom,
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
            },
            android: {
              elevation: 8,
            },
          }),
        },
        tabBarShowLabel: false,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t("tabs.home"),
          tabBarIcon: ({ focused }) => (
            <TabIcon name="home" label={t("tabs.home")} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t("tabs.history"),
          tabBarIcon: ({ focused }) => (
            <TabIcon name="calendar" label={t("tabs.history")} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: t("tabs.community"),
          tabBarIcon: ({ focused }) => (
            <TabIcon name="people" label={t("tabs.community")} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: t("tabs.insights"),
          tabBarIcon: ({ focused }) => (
            <TabIcon name="stats-chart" label={t("tabs.insights")} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
          tabBarIcon: ({ focused }) => (
            <TabIcon name="person" label={t("tabs.profile")} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const tabStyles = StyleSheet.create({
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 10,
    position: "relative",
    minWidth: 56,
  },
  activeIndicator: {
    position: "absolute",
    top: -10,
    width: 28,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  label: {
    fontSize: 11,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.textTertiary,
    marginTop: 4,
  },
  labelActive: {
    color: colors.primary,
  },
});
