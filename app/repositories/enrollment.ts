import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "~/db/schema";

export const upsertEnrollment = async (
  db: DrizzleD1Database,
  studentId: string,
  courseId: string,
): Promise<void> => {
  await db
    .insert(schema.enrollment)
    .values({
      studentId,
      courseId,
    })
    .onConflictDoNothing()
    .execute();
};
