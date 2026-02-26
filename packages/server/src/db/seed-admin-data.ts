/**
 * Seed 3 months of realistic mood data for admin@emovo.app
 *
 * Usage:
 *   npx tsx src/db/seed-admin-data.ts
 *
 * Requires DATABASE_URL and ENCRYPTION_MASTER_KEY in .env
 */
import { randomUUID } from "node:crypto";
import { createCipheriv, randomBytes, hkdfSync } from "node:crypto";

import postgres from "postgres";
import "dotenv/config";

// ── Config ───────────────────────────────────────────────────────
const DATABASE_URL = process.env.DATABASE_URL!;
const ENCRYPTION_MASTER_KEY = process.env.ENCRYPTION_MASTER_KEY!;
const TARGET_EMAIL = "admin@emovo.app";

if (!DATABASE_URL || !ENCRYPTION_MASTER_KEY) {
  console.error("Missing DATABASE_URL or ENCRYPTION_MASTER_KEY in .env");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { max: 5 });

// ── Encryption (mirrors encryption.service.ts) ───────────────────
function encryptNote(
  plaintext: string,
  userId: string,
  entryId: string,
  keyVersion: number,
): Buffer {
  const masterKey = Buffer.from(ENCRYPTION_MASTER_KEY, "hex");
  const info = `emovo:note:${userId}:v${keyVersion}`;
  const key = Buffer.from(hkdfSync("sha256", masterKey, "", info, 32));
  const iv = randomBytes(12);
  const aad = Buffer.from(`${userId}||${entryId}||${keyVersion}`);
  const cipher = createCipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
  cipher.setAAD(aad);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]);
}

// ── Realistic data pools ─────────────────────────────────────────

const notesByMood: Record<number, string[]> = {
  1: [
    "Terrible day. Everything went wrong at work and I couldn't sleep last night.",
    "Feeling overwhelmed and anxious. Too many deadlines piling up.",
    "Had an argument with a close friend. Can't stop thinking about it.",
    "Exhausted and burned out. Need a break desperately.",
    "Woke up with a headache and the day only got worse from there.",
    "Feeling really lonely today. Missing the people I care about.",
    "Nothing seems to be going right. Struggling to find motivation.",
    "Bad news from the doctor. Trying to stay positive but it's hard.",
  ],
  2: [
    "Didn't sleep well. Dragging through the day feeling foggy.",
    "Work was stressful. Too many meetings and not enough time to focus.",
    "Skipped my workout because I just didn't have the energy.",
    "Feeling a bit down. The weather has been gloomy all week.",
    "Had a minor disagreement at home. Nothing major but it bugged me.",
    "Stressed about finances. Need to figure out a better budget.",
    "Feeling disconnected from friends lately. Should reach out more.",
    "Ate poorly today. Need to get back on track with healthy eating.",
    "Procrastinated on important tasks. Feeling guilty about it.",
    "Traffic was awful and it set a negative tone for the whole day.",
  ],
  3: [
    "Average day. Nothing special but nothing bad either.",
    "Worked from home. Got some things done but could have been more productive.",
    "Tried a new recipe for dinner. It turned out okay, not great.",
    "Had a quiet evening reading. Sometimes that's exactly what I need.",
    "Mixed feelings today. Some good moments, some frustrating ones.",
    "Went grocery shopping and did some chores. Routine kind of day.",
    "Caught up on emails and admin tasks. Boring but necessary.",
    "Weather was nice but I stayed inside most of the day.",
    "Had lunch with a coworker. Pleasant but nothing memorable.",
    "Spent some time journaling and reflecting. Feeling neutral about things.",
  ],
  4: [
    "Good day at work! Finally finished that project I've been working on.",
    "Had a great workout this morning. Feeling energized.",
    "Caught up with an old friend over coffee. Really enjoyed it.",
    "Beautiful weather today. Went for a walk in the park during lunch.",
    "Cooked a delicious meal and enjoyed it with family.",
    "Made progress on my personal goals. Small steps but feels good.",
    "Got positive feedback from my manager. Hard work paying off.",
    "Spent quality time with my partner. We watched a movie together.",
    "Slept really well last night. Makes such a difference in my mood.",
    "Went to a yoga class. Left feeling calm and centered.",
    "Read a great book chapter. Learning new things always lifts my spirits.",
    "Organized my workspace. Clean space, clear mind!",
  ],
  5: [
    "Amazing day! Got promoted at work. All the effort was worth it!",
    "Spent the whole day with family. So much laughter and joy.",
    "Completed a 10K run - personal best time! Feeling incredible.",
    "Surprise visit from my best friend. We had the best time.",
    "Everything just clicked today. Productive, social, and restful.",
    "Went on a beautiful hike. Nature always fills me with gratitude.",
    "Celebrated a milestone anniversary. Feeling so grateful and loved.",
    "Had an incredible workout followed by a great meal. Peak day!",
    "Got amazing news - the project I proposed got approved!",
    "Perfect weekend. Brunch with friends, afternoon walk, cozy evening.",
  ],
};

// Weighted mood distribution - realistic bell curve leaning positive
// Score weights: 1=5%, 2=15%, 3=25%, 4=35%, 5=20%
function getWeightedMood(): number {
  const r = Math.random() * 100;
  if (r < 5) return 1;
  if (r < 20) return 2;
  if (r < 45) return 3;
  if (r < 80) return 4;
  return 5;
}

// Trigger patterns by mood (trigger names from DEFAULT_TRIGGERS)
const triggersByMood: Record<number, string[][]> = {
  1: [
    ["Work", "Sleep"],
    ["Health", "Sleep"],
    ["Relationships", "Work"],
    ["Finance", "Work"],
    ["Sleep"],
    ["Work", "Health", "Sleep"],
    ["Relationships"],
  ],
  2: [
    ["Work"],
    ["Sleep", "Work"],
    ["Health"],
    ["Weather"],
    ["Relationships"],
    ["Finance"],
    ["Work", "Sleep"],
    ["Food"],
    ["Social"],
  ],
  3: [["Work"], ["Food"], ["Weather"], ["Sleep"], ["Social"], ["Work", "Food"], [], ["Family"]],
  4: [
    ["Work", "Exercise"],
    ["Exercise"],
    ["Social", "Food"],
    ["Weather", "Exercise"],
    ["Family", "Food"],
    ["Work"],
    ["Social"],
    ["Relationships"],
    ["Sleep"],
    ["Exercise", "Health"],
  ],
  5: [
    ["Work", "Social"],
    ["Family", "Social"],
    ["Exercise", "Health"],
    ["Social", "Food"],
    ["Relationships", "Social"],
    ["Exercise"],
    ["Family"],
    ["Work", "Social", "Exercise"],
  ],
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  console.log(`Looking up user: ${TARGET_EMAIL}`);

  // Find user
  const [user] = await sql`
    SELECT id, encryption_key_version, timezone
    FROM users
    WHERE LOWER(email) = LOWER(${TARGET_EMAIL})
    LIMIT 1
  `;

  if (!user) {
    console.error(`User ${TARGET_EMAIL} not found!`);
    process.exit(1);
  }

  const userId = user.id as string;
  const keyVersion = (user.encryption_key_version as number) || 1;
  const userTz = (user.timezone as string) || "UTC";
  console.log(`Found user: ${userId} (tz: ${userTz}, keyVer: ${keyVersion})`);

  // Get default trigger IDs
  const defaultTriggers = await sql`
    SELECT id, name FROM triggers WHERE is_default = true AND user_id IS NULL
  `;
  const triggerMap = new Map<string, string>();
  for (const t of defaultTriggers) {
    triggerMap.set(t.name as string, t.id as string);
  }
  console.log(`Found ${triggerMap.size} default triggers`);

  // Check existing entries to avoid duplicates
  const existingDates = await sql`
    SELECT (logged_at AT TIME ZONE ${userTz})::date AS d
    FROM mood_entries
    WHERE user_id = ${userId}
  `;
  const existingSet = new Set(existingDates.map((r) => (r.d as Date).toISOString().split("T")[0]));
  console.log(`User already has ${existingSet.size} entries`);

  // Generate dates: 3 months back from today
  const now = new Date();
  const startDate = new Date(now);
  startDate.setMonth(startDate.getMonth() - 3);

  const dates: Date[] = [];
  const cursor = new Date(startDate);
  while (cursor <= now) {
    const dateStr = cursor.toISOString().split("T")[0];
    if (!existingSet.has(dateStr)) {
      dates.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  // Skip ~10% of days randomly for realism (missed days)
  const datesToSeed = dates.filter(() => Math.random() > 0.1);
  console.log(`Will create ${datesToSeed.length} entries (skipping ~10% for realism)`);

  let created = 0;

  for (const date of datesToSeed) {
    const entryId = randomUUID();
    const clientEntryId = randomUUID();
    const moodScore = getWeightedMood();

    // Random time during the day (7am-11pm)
    const hour = 7 + Math.floor(Math.random() * 16);
    const minute = Math.floor(Math.random() * 60);
    const loggedAt = new Date(date);
    loggedAt.setHours(hour, minute, 0, 0);

    // ~70% chance of having a note
    let encryptedNote: Buffer | null = null;
    if (Math.random() < 0.7) {
      const notes = notesByMood[moodScore];
      const note = pick(notes);
      encryptedNote = encryptNote(note, userId, entryId, keyVersion);
    }

    // Pick triggers for this mood
    const triggerCombos = triggersByMood[moodScore];
    const selectedTriggerNames = pick(triggerCombos);
    const triggerIds = selectedTriggerNames
      .map((name) => triggerMap.get(name))
      .filter(Boolean) as string[];

    try {
      // Insert mood entry
      await sql`
        INSERT INTO mood_entries (id, user_id, client_entry_id, mood_score, encrypted_note, note_key_version, logged_at, created_at, updated_at)
        VALUES (
          ${entryId},
          ${userId},
          ${clientEntryId},
          ${moodScore},
          ${encryptedNote},
          ${keyVersion},
          ${loggedAt.toISOString()},
          ${loggedAt.toISOString()},
          ${loggedAt.toISOString()}
        )
      `;

      // Insert trigger associations
      for (const triggerId of triggerIds) {
        await sql`
          INSERT INTO entry_triggers (entry_id, trigger_id)
          VALUES (${entryId}, ${triggerId})
          ON CONFLICT DO NOTHING
        `;
      }

      created++;
    } catch (err: any) {
      // Skip duplicate days
      if (err.code === "23505") {
        console.log(`  Skipped ${date.toISOString().split("T")[0]} (duplicate)`);
        continue;
      }
      throw err;
    }
  }

  console.log(`\nDone! Created ${created} mood entries for ${TARGET_EMAIL}`);

  // Print summary stats
  const stats = await sql`
    SELECT
      COUNT(*) as total,
      ROUND(AVG(mood_score), 2) as avg_mood,
      MIN(logged_at)::date as first_entry,
      MAX(logged_at)::date as last_entry
    FROM mood_entries
    WHERE user_id = ${userId}
  `;
  const s = stats[0];
  console.log(`\nAccount stats:`);
  console.log(`  Total entries: ${s.total}`);
  console.log(`  Average mood: ${s.avg_mood}`);
  console.log(`  Date range: ${s.first_entry} → ${s.last_entry}`);

  await sql.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
