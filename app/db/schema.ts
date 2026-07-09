import { relations } from "drizzle-orm";
import { int, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const teacher = sqliteTable("teacher", {
  id: text().primaryKey(),
  name: text().notNull(),
});
export const teacherRelations = relations(teacher, ({ many }) => ({
  courses: many(course),
}));

export const course = sqliteTable("course", {
  id: text().primaryKey(),
  ownerId: text()
    .notNull()
    .references(() => teacher.id),
  name: text().notNull(),
});
export const courseRelations = relations(course, ({ one, many }) => ({
  owner: one(teacher, {
    fields: [course.ownerId],
    references: [teacher.id],
  }),
  contents: many(content),
  enrollments: many(enrollment),
}));

export const content = sqliteTable("content", {
  id: text().primaryKey(),
  containerId: text()
    .notNull()
    .references(() => course.id),
  title: text().notNull(),
  content: text().notNull(),
});
export const contentRelations = relations(content, ({ one, many }) => ({
  container: one(course, {
    fields: [content.containerId],
    references: [course.id],
  }),
  quizzes: many(quiz),
}));

export const publishState = sqliteTable("publish_state", {
  content_id: text()
    .primaryKey()
    .references(() => content.id),
  state: text().notNull().default("UNPUBLISHED"),
  updatedAt: text().notNull(),
});
export const publishStateRelations = relations(publishState, ({ one }) => ({
  content: one(content, {
    fields: [publishState.content_id],
    references: [content.id],
  }),
}));

export const quiz = sqliteTable(
  "quiz",
  {
    id: text().primaryKey(),
    containerId: text()
      .notNull()
      .references(() => content.id),
    order: int().notNull(),
    description: text().notNull().default(""),
    solution: int().notNull(),
    choices: text().notNull().default("[]"),
  },
  (table) => [uniqueIndex("id_order").on(table.id, table.order)],
);
export const quizRelations = relations(quiz, ({ one, many }) => ({
  container: one(content, {
    fields: [quiz.containerId],
    references: [content.id],
  }),
  submissions: many(submission),
}));

export const student = sqliteTable("student", {
  id: text().primaryKey(),
  name: text().notNull(),
});
export const studentRelations = relations(student, ({ many }) => ({
  enrollments: many(enrollment),
  submissions: many(submission),
}));

export const enrollment = sqliteTable(
  "enrollment",
  {
    courseId: text()
      .notNull()
      .references(() => course.id),
    studentId: text()
      .notNull()
      .references(() => student.id),
  },
  (table) => [uniqueIndex("course_student").on(table.courseId, table.studentId)],
);
export const enrollmentRelations = relations(enrollment, ({ one }) => ({
  course: one(course, {
    fields: [enrollment.courseId],
    references: [course.id],
  }),
  student: one(student, {
    fields: [enrollment.studentId],
    references: [student.id],
  }),
}));

export const submission = sqliteTable("submission", {
  createdById: text()
    .notNull()
    .references(() => student.id),
  sentToId: text()
    .notNull()
    .references(() => quiz.id),
  createdAt: int({ mode: "timestamp" }).notNull(),
  answer: int().notNull(),
});
export const submissionRelations = relations(submission, ({ one }) => ({
  createdBy: one(student, {
    fields: [submission.createdById],
    references: [student.id],
  }),
  sentTo: one(quiz, {
    fields: [submission.sentToId],
    references: [quiz.id],
  }),
}));
