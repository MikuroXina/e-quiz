import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "~/db/schema";

export const upsertTeacher = async (
  db: DrizzleD1Database,
  id: string,
  name: string,
): Promise<void> => {
  await db
    .insert(schema.teacher)
    .values({
      id,
      name,
    })
    .onConflictDoUpdate({
      target: schema.teacher.id,
      set: { name },
    })
    .execute();
};
