"use client";

import type { MoodEntry, MoodCalendar } from "@emovo/shared";
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  addDays,
  eachDayOfInterval,
  getDay,
  isSameDay,
} from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { useEffect, useState, useCallback } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { getMoodCalendarApi } from "@/services/mood.api";
import { listMoodsApi } from "@/services/mood.api";
import { MOOD_EMOJIS, MOOD_LABELS, MOOD_HEX } from "@/theme/constants";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function HistoryPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendar, setCalendar] = useState<MoodCalendar>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [entriesLoading, setEntriesLoading] = useState(false);

  const monthStr = format(currentMonth, "yyyy-MM");

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMoodCalendarApi(monthStr);
      setCalendar(data);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, [monthStr]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  const fetchEntriesForDate = async (date: Date) => {
    setEntriesLoading(true);
    const dateStr = format(date, "yyyy-MM-dd");
    try {
      const nextDay = format(addDays(date, 1), "yyyy-MM-dd");
      const result = await listMoodsApi({ from: dateStr, to: nextDay, limit: 10 });
      setEntries(result.entries);
    } catch {
      setEntries([]);
    } finally {
      setEntriesLoading(false);
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    fetchEntriesForDate(date);
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const startPadding = getDay(startOfMonth(currentMonth));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">History</h1>

      {/* Calendar */}
      <Card className="p-4">
        {/* Month navigation */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="rounded-lg p-2 text-text-secondary hover:bg-surface-elevated"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-lg font-bold text-text-primary">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="rounded-lg p-2 text-text-secondary hover:bg-surface-elevated"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="mb-2 grid grid-cols-7 gap-1">
          {WEEKDAYS.map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-text-tertiary">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {loading ? (
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for padding */}
            {Array.from({ length: startPadding }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {/* Day cells */}
            {days.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const moodScore = calendar[dateStr];
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());

              return (
                <button
                  key={dateStr}
                  onClick={() => handleDateClick(day)}
                  className={cn(
                    "flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition-colors",
                    isSelected ? "ring-2 ring-brand-green" : "hover:bg-surface-elevated",
                    isToday && "font-bold",
                  )}
                >
                  <span
                    className={cn("text-xs", isToday ? "text-brand-green" : "text-text-primary")}
                  >
                    {format(day, "d")}
                  </span>
                  {moodScore && (
                    <div
                      className="mt-0.5 h-2 w-2 rounded-full"
                      style={{ backgroundColor: MOOD_HEX[moodScore] }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* Selected date entries */}
      {selectedDate && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-text-secondary">
            {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </h3>
          {entriesLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : entries.length === 0 ? (
            <EmptyState
              icon={<CalendarIcon size={32} />}
              title="No entries"
              description="You haven't logged any moods on this day"
            />
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <Card key={entry.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{MOOD_EMOJIS[entry.moodScore]}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="mood" moodLevel={entry.moodScore}>
                          {MOOD_LABELS[entry.moodScore]}
                        </Badge>
                        <span className="text-xs text-text-tertiary">
                          {format(new Date(entry.loggedAt || entry.createdAt), "h:mm a")}
                        </span>
                      </div>
                      {entry.note && (
                        <p className="mt-2 text-sm text-text-secondary">{entry.note}</p>
                      )}
                      {entry.triggers && entry.triggers.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {entry.triggers.map((trigger: { id: string; name: string }) => (
                            <span
                              key={trigger.id}
                              className="rounded-full bg-surface-elevated px-2 py-0.5 text-xs text-text-secondary"
                            >
                              {trigger.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
