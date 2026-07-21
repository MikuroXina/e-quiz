import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "~/db/schema";
import { eq } from "drizzle-orm";
import type { Result } from "~/lib/result";

export type CourseError = "TARGET_NOT_CREATED_BY_OPERATOR";

export const createCourse = async (
  db: DrizzleD1Database,
  ownerId: string,
  name: string,
): Promise<void> => {
  const newId = crypto.randomUUID();
  await db
    .insert(schema.course)
    .values({
      id: newId,
      name,
      ownerId,
    })
    .execute();
};

export const updateName = async (
  db: DrizzleD1Database<typeof schema>,
  operatorId: string,
  courseId: string,
  name: string,
): Promise<Result<CourseError, never[]>> => {
  const target = await db.query.course.findFirst({
    columns: { id: true },
    where: (course, { eq, and }) => and(eq(course.id, courseId), eq(course.ownerId, operatorId)),
  });
  if (target == null) {
    return { success: false, error: "TARGET_NOT_CREATED_BY_OPERATOR" };
  }
  await db
    .update(schema.course)
    .set({
      name,
    })
    .where(eq(schema.course.id, courseId))
    .execute();
  return { success: true, value: [] };
};
