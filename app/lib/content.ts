import * as v from "valibot";

export const quizSchema = v.object({
  id: v.pipe(v.string(), v.brand("Quiz")),
  description: v.string(),
  solution: v.pipe(v.number(), v.integer()),
  choices: v.array(v.string()),
});
export type Quiz = v.InferOutput<typeof quizSchema>;

export const publishStateSchema = v.variant("type", [
  v.object({
    type: v.literal("UNPUBLISHED"),
  }),
  v.object({
    type: v.literal("PUBLISHED"),
    publishedAt: v.date(),
  }),
]);
export type PublishState = v.InferOutput<typeof publishStateSchema>;

export const contentSchema = v.object({
  id: v.pipe(v.string(), v.brand("Content")),
  title: v.pipe(v.string(), v.nonEmpty()),
  body: v.string(),
  quizzes: v.array(quizSchema),
  publishState: publishStateSchema,
});
export type Content = v.InferOutput<typeof contentSchema>;
