import { int, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const teacher = sqliteTable("teacher", {
  id: text().primaryKey(),
  name: text().notNull(),
});

export const course = sqliteTable("course", {
  id: text().primaryKey(),
  owner: text()
    .notNull()
    .references(() => teacher.id),
  name: text().notNull(),
});

export const content = sqliteTable("content", {
  id: text().primaryKey(),
  container: text()
    .notNull()
    .references(() => course.id),
  title: text().notNull(),
  content: text().notNull(),
});

export const quiz = sqliteTable("quiz", {
  id: text().primaryKey(),
  container: text()
    .notNull()
    .references(() => content.id),
  solution: int().notNull(),
});

export const student = sqliteTable("student", {
  id: text().primaryKey(),
  name: text().notNull(),
});

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

export const submission = sqliteTable("submission", {
  createdBy: text()
    .notNull()
    .references(() => student.id),
  sentTo: text()
    .notNull()
    .references(() => quiz.id),
  createdAt: int({ mode: "timestamp" }).notNull(),
  answer: int().notNull(),
});
