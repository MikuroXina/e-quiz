import type { DrizzleD1Database } from "drizzle-orm/d1";
import type { Content, PublishState } from "~/lib/content";
import * as schema from "~/db/schema";
import { and, eq } from "drizzle-orm";
import type { Result } from "~/lib/result";

export type ContentError = "TARGET_NOT_CREATED_BY_OPERATOR";

export const createContent = async <TSchema extends Record<string, unknown>>(
  db: DrizzleD1Database<TSchema>,
  containerId: string,
  title: string,
): Promise<void> => {
  const newId = crypto.randomUUID();
  await db
    .insert(schema.content)
    .values({
      id: newId,
      containerId,
      title,
      content: "",
    })
    .execute();
};

export const setTitle = async <TSchema extends Record<string, unknown>>(
  db: DrizzleD1Database<TSchema>,
  operatorId: string,
  contentId: string,
  title: string,
): Promise<Result<ContentError, never[]>> => {
  const target = await db
    .select({ id: schema.content.id })
    .from(schema.content)
    .innerJoin(schema.course, eq(schema.content.containerId, schema.course.id))
    .innerJoin(schema.teacher, eq(schema.course.ownerId, schema.teacher.id))
    .where(and(eq(schema.content.id, contentId), eq(schema.teacher.id, operatorId)))
    .limit(1);
  if (target.length === 0) {
    return { success: false, error: "TARGET_NOT_CREATED_BY_OPERATOR" };
  }

  await db.update(schema.content).set({ title }).where(eq(schema.content.id, contentId)).execute();
  return { success: true, value: [] };
};

export const setPublishState = async <TSchema extends Record<string, unknown>>(
  db: DrizzleD1Database<TSchema>,
  operatorId: string,
  contentId: string,
  newPublishState: PublishState,
): Promise<Result<ContentError, never[]>> => {
  const target = await db
    .select({ id: schema.content.id })
    .from(schema.content)
    .innerJoin(schema.course, eq(schema.content.containerId, schema.course.id))
    .innerJoin(schema.teacher, eq(schema.course.ownerId, schema.teacher.id))
    .where(and(eq(schema.content.id, contentId), eq(schema.teacher.id, operatorId)))
    .limit(1);
  if (target.length === 0) {
    return { success: false, error: "TARGET_NOT_CREATED_BY_OPERATOR" };
  }

  const now = new Date().toISOString();
  await db
    .insert(schema.publishState)
    .values({
      contentId: contentId,
      state: newPublishState.type,
      updatedAt: newPublishState.publishedAt ?? now,
    })
    .onConflictDoUpdate({
      target: schema.publishState.contentId,
      set: {
        state: newPublishState.type,
        updatedAt: newPublishState.publishedAt ?? now,
      },
    });
  return { success: true, value: [] };
};

export const updateContent = async (
  db: DrizzleD1Database,
  operatorId: string,
  newContent: Content,
): Promise<Result<ContentError, never[]>> => {
  const target = await db
    .select({ id: schema.content.id })
    .from(schema.content)
    .innerJoin(schema.course, eq(schema.content.containerId, schema.course.id))
    .innerJoin(schema.teacher, eq(schema.course.ownerId, operatorId))
    .where(eq(schema.content.id, newContent.id))
    .limit(1);
  if (target.length === 0) {
    return { success: false, error: "TARGET_NOT_CREATED_BY_OPERATOR" };
  }
  const updatedAt = newContent.publishState?.publishedAt ?? new Date().toISOString();
  await db.batch([
    db
      .insert(schema.publishState)
      .values({
        contentId: newContent.id,
        state: newContent.publishState.type,
        updatedAt,
      })
      .onConflictDoUpdate({
        target: schema.publishState.contentId,
        set: {
          state: newContent.publishState.type,
          updatedAt,
        },
      }),
    db
      .update(schema.content)
      .set({
        content: newContent.body,
      })
      .where(eq(schema.content.id, newContent.id)),
    ...newContent.quizzes.map((quiz, i) =>
      db
        .update(schema.quiz)
        .set({
          order: i,
          description: quiz.description,
          solution: quiz.solution,
          choices: JSON.stringify(quiz.choices),
        })
        .where(eq(schema.quiz.id, quiz.id)),
    ),
  ]);
  return { success: true, value: [] };
};
