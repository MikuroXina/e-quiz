import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "~/db/schema";

export const upsertFirstView = async <TSchema extends Record<string, unknown>>(
  db: DrizzleD1Database<TSchema>,
  whoId: string,
  readId: string,
): Promise<void> => {
  await db
    .insert(schema.firstView)
    .values({
      whoId,
      readId,
    })
    .onConflictDoNothing();
};
