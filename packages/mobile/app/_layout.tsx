import {
  SourceSerif4_400Regular,
  SourceSerif4_600SemiBold,
  SourceSerif4_700Bold,
} from "@expo-google-fonts/source-serif-4";
import { useFonts } from "expo-font";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import Toast from "react-native-toast-message";

import { ErrorBoundary } from "../src/components/ui/ErrorBoundary";
import { toastConfig } from "../src/components/ui/ToastConfig";
import { initI18n } from "../src/i18n/config";
import { useAuthStore } from "../src/stores/auth.store";
import { ThemeProvider, useTheme } from "../src/theme/ThemeContext";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const [i18nReady, setI18nReady] = useState(false);

  const [fontsLoaded] = useFonts({
    SourceSerif4_400Regular,
    SourceSerif4_600SemiBold,
    SourceSerif4_700Bold,
  });

  useEffect(() => {
    hydrate();
    initI18n().then(() => setI18nReady(true));
  }, [hydrate]);

  useEffect(() => {
    if (fontsLoaded && i18nReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, i18nReady]);

  if (!fontsLoaded || !i18nReady) {
    return null;
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
      <Toast config={toastConfig} />
    </ErrorBoundary>
  );
}

function AppContent() {
  const { isDark } = useTheme();
  const router = useRouter();

  // Deep link handling — emovo://reset-password?token=...
  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      const parsed = Linking.parse(event.url);
      if (parsed.path === "reset-password" && parsed.queryParams?.token) {
        router.push({
          pathname: "/(auth)/reset-password",
          params: { token: parsed.queryParams.token as string },
        });
      }
    };

    // Handle URL that launched the app
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });

    // Handle URL while app is open
    const subscription = Linking.addEventListener("url", handleUrl);
    return () => subscription.remove();
  }, [router]);

  // Notification listeners — handle taps on push notifications
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  useEffect(() => {
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        | Record<string, unknown>
        | undefined;
      if (!data) return;
      try {
        if (data.conversationId) {
          router.push({
            pathname: "/conversation",
            params: { id: data.conversationId as string },
          });
        } else if (data.postId) {
          router.push({ pathname: "/post/[id]", params: { id: data.postId as string } });
        } else if (data.followerId) {
          router.push("/follow-requests");
        } else {
          router.push("/notifications");
        }
      } catch {
        // Navigation may fail if app isn't fully mounted yet
      }
    });
    return () => {
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [router]);

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding/index" options={{ animation: "fade" }} />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="log-mood"
          options={{ presentation: "modal", animation: "slide_from_bottom" }}
        />
        <Stack.Screen name="faq" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="post/[id]" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="backup-sync" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="notifications" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="admin" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="follow-requests" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="profile/[id]" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="group/[id]" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="conversation" options={{ animation: "slide_from_right" }} />
        <Stack.Screen
          name="search"
          options={{ presentation: "modal", animation: "slide_from_bottom" }}
        />
      </Stack>
    </>
  );
}
