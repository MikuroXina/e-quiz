import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "~/db/schema";

export const createSubmission = async (
  db: DrizzleD1Database,
  createdById: string,
  sentToId: string,
  createdAt: Date,
  answer: number,
): Promise<void> => {
  await db.insert(schema.submission).values({
    createdById,
    sentToId,
    createdAt,
    answer,
  });
};
