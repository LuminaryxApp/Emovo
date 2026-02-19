import { DEFAULT_TRIGGERS } from "@emovo/shared";
import { eq, and, isNull } from "drizzle-orm";

import { db } from "../config/database.js";

import { triggers } from "./schema/triggers.js";

/**
 * Seed default triggers.
 * Idempotent: checks existence before inserting.
 */
export async function seedDefaultTriggers(): Promise<void> {
  for (const trigger of DEFAULT_TRIGGERS) {
    const [existing] = await db
      .select({ id: triggers.id })
      .from(triggers)
      .where(
        and(eq(triggers.name, trigger.name), eq(triggers.isDefault, true), isNull(triggers.userId)),
      )
      .limit(1);

    if (!existing) {
      await db.insert(triggers).values({
        name: trigger.name,
        icon: trigger.icon,
        isDefault: true,
        userId: null,
      });
    }
  }

  console.log(`Seeded ${DEFAULT_TRIGGERS.length} default triggers`);
}

// Allow running directly: npx tsx src/db/seed.ts
if (process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js")) {
  seedDefaultTriggers()
    .then(() => {
      console.log("Seed complete");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seed failed:", err);
      process.exit(1);
    });
}
