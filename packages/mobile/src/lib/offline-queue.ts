import type { CreateMoodInput } from "@emovo/shared";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { createMoodApi } from "../services/mood.api";

const QUEUE_KEY = "emovo:offline_queue";

interface QueuedEntry {
  input: CreateMoodInput;
  queuedAt: string;
}

export async function enqueueMoodEntry(input: CreateMoodInput): Promise<void> {
  const queue = await getQueue();
  queue.push({ input, queuedAt: new Date().toISOString() });
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function getQueue(): Promise<QueuedEntry[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function getQueueLength(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}

export async function flushQueue(): Promise<{ synced: number; failed: number }> {
  const queue = await getQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  const remaining: QueuedEntry[] = [];

  for (const entry of queue) {
    try {
      await createMoodApi(entry.input);
      synced++;
    } catch {
      // Keep failed entries in the queue for retry
      remaining.push(entry);
    }
  }

  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  return { synced, failed: remaining.length };
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}
