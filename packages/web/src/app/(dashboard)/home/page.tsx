"use client";

import type { MoodEntry, StreakData, MoodStats } from "@emovo/shared";
import { format, addDays } from "date-fns";
import { Flame, TrendingUp, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { MoodLogModal } from "@/components/mood/mood-log-modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listMoodsApi } from "@/services/mood.api";
import { getStreakApi, getStatsSummaryApi } from "@/services/stats.api";
import { useAuthStore } from "@/stores/auth.store";
import { MOOD_EMOJIS, MOOD_LABELS } from "@/theme/constants";

const DAILY_QUOTES = [
  "Every day is a new beginning. Take a deep breath, smile, and start again.",
  "Your feelings are valid. Acknowledging them is the first step to understanding yourself.",
  "Small steps every day lead to big changes over time. Keep going.",
  "You don't have to be positive all the time. It's okay to feel what you feel.",
  "The only way out is through. Be gentle with yourself on the journey.",
  "Growth happens when you pay attention to what your emotions are telling you.",
  "You are more resilient than you know. Trust the process.",
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getDailyQuote(): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
  );
  return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length];
}

export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [stats, setStats] = useState<MoodStats | null>(null);
  const [todayEntry, setTodayEntry] = useState<MoodEntry | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);

  useEffect(() => {
    getStreakApi()
      .then(setStreak)
      .catch(() => {});
    getStatsSummaryApi({ period: "week" })
      .then(setStats)
      .catch(() => {});

    const today = format(new Date(), "yyyy-MM-dd");
    const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
    listMoodsApi({ from: today, to: tomorrow, limit: 1 })
      .then((r) => {
        if (r.entries.length > 0) setTodayEntry(r.entries[0]);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl font-bold text-text-primary">
          {getGreeting()}, {user?.displayName?.split(" ")[0] || "there"}{" "}
          <span className="inline-block origin-[70%_70%] animate-[wave_2s_ease-in-out_1]">
            &#128075;
          </span>
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      {/* Today's Mood */}
      <Card className="p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase text-section-label">
          Today&apos;s Mood
        </h2>
        {todayEntry ? (
          <div className="flex items-center gap-4">
            <span className="text-4xl">{MOOD_EMOJIS[todayEntry.moodScore]}</span>
            <div>
              <p className="text-lg font-bold text-text-primary">
                {MOOD_LABELS[todayEntry.moodScore]}
              </p>
              {todayEntry.note && (
                <p className="mt-1 text-sm text-text-secondary line-clamp-2">{todayEntry.note}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="mb-3 text-sm text-text-secondary">How are you feeling today?</p>
            <Button onClick={() => setShowLogModal(true)} size="lg">
              <Plus size={18} className="mr-2" />
              Log Your Mood
            </Button>
          </div>
        )}
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="bg-brand-green/5 p-4 text-center">
          <Flame size={24} className="mx-auto mb-2 text-brand-green" />
          <p className="text-2xl font-bold text-text-primary">{streak?.currentStreak ?? 0}</p>
          <p className="text-xs text-text-secondary">Current Streak</p>
        </Card>
        <Card className="bg-brand-blue/5 p-4 text-center">
          <Flame size={24} className="mx-auto mb-2 text-brand-blue" />
          <p className="text-2xl font-bold text-text-primary">{streak?.longestStreak ?? 0}</p>
          <p className="text-xs text-text-secondary">Longest Streak</p>
        </Card>
        <Card className="bg-brand-green/5 p-4 text-center">
          <TrendingUp size={24} className="mx-auto mb-2 text-brand-green" />
          <p className="text-2xl font-bold text-text-primary">
            {stats?.avgMood ? stats.avgMood.toFixed(1) : "\u2014"}
          </p>
          <p className="text-xs text-text-secondary">Avg Mood (Week)</p>
        </Card>
        <Card className="bg-brand-blue/5 p-4 text-center">
          <p className="text-2xl font-bold text-text-primary">{stats?.entryCount ?? 0}</p>
          <p className="text-xs text-text-secondary">Entries (Week)</p>
        </Card>
      </div>

      {/* Motivational quote */}
      <Card className="bg-gradient-to-r from-brand-green to-brand-blue p-6 text-white">
        <p className="text-sm font-medium opacity-80">Daily thought</p>
        <p className="mt-1 text-lg font-semibold">{getDailyQuote()}</p>
      </Card>

      {/* Log mood floating button on mobile */}
      {!todayEntry && (
        <button
          onClick={() => setShowLogModal(true)}
          className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-green text-white shadow-lg transition-transform hover:scale-105 lg:hidden"
        >
          <Plus size={24} />
        </button>
      )}

      <MoodLogModal
        open={showLogModal}
        onClose={() => setShowLogModal(false)}
        onLogged={(entry) => {
          setTodayEntry(entry);
          setShowLogModal(false);
        }}
      />
    </div>
  );
}
