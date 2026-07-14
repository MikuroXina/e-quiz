import { CloudflareContext } from "~/lib/cloudflare";
import type { Route } from "./+types/init-fake";
import { redirect } from "react-router";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";
import { fakerJA as faker } from "@faker-js/faker";
import type { InferInsertModel } from "drizzle-orm";

export async function loader({ context }: Route.LoaderArgs) {
  const { env } = context.get(CloudflareContext);
  if (env.NODE_ENV === "production") {
    return redirect("/");
  }

  const db = drizzle(env.e_quiz_db);

  console.log("Deleting database…");

  await db.delete(schema.teacher);
  await db.delete(schema.course);
  await db.delete(schema.content);
  await db.delete(schema.quiz);
  await db.delete(schema.student);
  await db.delete(schema.enrollment);
  await db.delete(schema.firstView);
  await db.delete(schema.submission);

  console.log("Injecting fake test data…");

  faker.seed(42);

  // insert teachers
  const newTeacher = (): InferInsertModel<typeof schema.teacher> => ({
    id: faker.string.uuid(),
    name: faker.person.fullName(),
  });
  const teachers = [newTeacher(), newTeacher(), newTeacher()];
  await db.insert(schema.teacher).values(teachers);

  // insert courses
  const newCourse = (teacherId: string): InferInsertModel<typeof schema.course> => ({
    id: faker.string.uuid(),
    name: faker.lorem.word(),
    ownerId: teacherId,
  });
  const courses = [newCourse(teachers[0].id), newCourse(teachers[0].id), newCourse(teachers[1].id)];
  await db.insert(schema.course).values(courses);

  // insert contents
  const newContent = (courseId: string): InferInsertModel<typeof schema.content> => ({
    id: faker.string.uuid(),
    containerId: courseId,
    title: faker.lorem.word(),
    content: faker.lorem.paragraphs(5, "\n\n"),
  });
  const contents = [newContent(courses[0].id), newContent(courses[0].id)];
  await db.insert(schema.content).values(contents);

  // insert quizzes
  const newQuiz = (contentId: string): InferInsertModel<typeof schema.quiz> => ({
    id: faker.string.uuid(),
    containerId: contentId,
    order: 0,
    description: faker.lorem.paragraph(),
    choices: JSON.stringify([
      faker.lorem.sentence(),
      faker.lorem.sentence(),
      faker.lorem.sentence(),
    ]),
    solution: 0,
  });
  const quizzes = [newQuiz(contents[0].id), newQuiz(contents[1].id)];
  await db.insert(schema.quiz).values(quizzes);

  // insert students
  const newStudent = (): InferInsertModel<typeof schema.student> => ({
    id: faker.string.uuid(),
    name: faker.person.fullName(),
  });
  const students = [...new Array(6)].map(newStudent);
  await db.insert(schema.student).values(students);

  // insert enrollments
  const newEnrollment = (
    courseId: string,
    studentId: string,
  ): InferInsertModel<typeof schema.enrollment> => ({
    courseId,
    studentId,
  });
  await db
    .insert(schema.enrollment)
    .values([
      newEnrollment(courses[0].id, students[0].id),
      newEnrollment(courses[0].id, students[1].id),
      newEnrollment(courses[0].id, students[2].id),
      newEnrollment(courses[0].id, students[3].id),
      newEnrollment(courses[0].id, students[4].id),
      newEnrollment(courses[0].id, students[5].id),
      newEnrollment(courses[1].id, students[0].id),
      newEnrollment(courses[1].id, students[1].id),
      newEnrollment(courses[1].id, students[6].id),
      newEnrollment(courses[2].id, students[0].id),
    ]);

  // insert first views
  const newFirstView = (
    studentId: string,
    contentId: string,
  ): InferInsertModel<typeof schema.firstView> => ({
    whoId: studentId,
    readId: contentId,
    createdAt: faker.date.recent({ days: { min: 3, max: 4 } }),
  });
  await db
    .insert(schema.firstView)
    .values([
      newFirstView(students[0].id, contents[0].id),
      newFirstView(students[1].id, contents[0].id),
      newFirstView(students[2].id, contents[0].id),
      newFirstView(students[3].id, contents[0].id),
      newFirstView(students[4].id, contents[0].id),
      newFirstView(students[0].id, contents[1].id),
      newFirstView(students[1].id, contents[1].id),
      newFirstView(students[2].id, contents[1].id),
    ]);

  // insert submissions
  const newWrongSubmission = (
    studentId: string,
    quizId: string,
  ): InferInsertModel<typeof schema.submission> => ({
    createdById: studentId,
    sentToId: quizId,
    createdAt: faker.date.recent({ days: { min: 1, max: 2 } }),
    answer: 1,
  });
  const newCorrectSubmission = (
    studentId: string,
    quizId: string,
  ): InferInsertModel<typeof schema.submission> => ({
    createdById: studentId,
    sentToId: quizId,
    createdAt: faker.date.recent({ days: { min: 1, max: 2 } }),
    answer: 0,
  });
  await db
    .insert(schema.submission)
    .values([
      newWrongSubmission(students[0].id, quizzes[0].id),
      newWrongSubmission(students[0].id, quizzes[0].id),
      newWrongSubmission(students[0].id, quizzes[0].id),
      newWrongSubmission(students[1].id, quizzes[0].id),
      newWrongSubmission(students[1].id, quizzes[0].id),
      newWrongSubmission(students[1].id, quizzes[0].id),
      newWrongSubmission(students[2].id, quizzes[0].id),
      newWrongSubmission(students[2].id, quizzes[0].id),
      newWrongSubmission(students[3].id, quizzes[0].id),
      newCorrectSubmission(students[0].id, quizzes[0].id),
      newCorrectSubmission(students[2].id, quizzes[0].id),
    ]);

  return { success: true };
}

export default function InitFakePage() {
  return (
    <main>
      <p>This is an endpoint for setup test data.</p>
      <p>Succeeded to initialize data with faker.js, so you can close this page.</p>
      <p>
        If you see this page on the production environment, it must be an incident. Please tell us
        about the situation happened.
      </p>
    </main>
  );
}
