export interface MoodEntry {
  id: string;
  userId: string;
  clientEntryId: string;
  moodScore: number;
  note: string | null;
  triggers: Trigger[];
  loggedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Trigger {
  id: string;
  name: string;
  icon: string | null;
  isDefault: boolean;
}

export interface MoodStats {
  avgMood: number;
  entryCount: number;
  moodDistribution: Record<number, number>;
  topTriggers: Array<{ trigger: Trigger; count: number; avgMood: number }>;
}

export interface MoodTrend {
  dataPoints: Array<{ date: string; avgMood: number; count: number }>;
}

export interface TriggerBreakdown {
  triggerBreakdown: Array<{ trigger: Trigger; count: number; avgMood: number }>;
}
