import { pgTable, uuid, primaryKey, index } from "drizzle-orm/pg-core";

import { moodEntries } from "./mood-entries.js";
import { triggers } from "./triggers.js";

export const entryTriggers = pgTable(
  "entry_triggers",
  {
    entryId: uuid("entry_id")
      .notNull()
      .references(() => moodEntries.id, { onDelete: "cascade" }),
    triggerId: uuid("trigger_id")
      .notNull()
      .references(() => triggers.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.entryId, table.triggerId] }),
    triggerIdx: index("entry_triggers_trigger_idx").on(table.triggerId),
  }),
);
