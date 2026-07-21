import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "~/db/schema";

export const upsertStudent = async (
  db: DrizzleD1Database,
  id: string,
  name: string,
): Promise<void> => {
  await db
    .insert(schema.student)
    .values({
      id,
      name,
    })
    .onConflictDoUpdate({
      target: schema.student.id,
      set: { name },
    })
    .execute();
};
