import { AuthContext } from "~/lib/session";
import type { Route } from "./+types/stats";
import { CloudflareContext } from "~/lib/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { NavBar } from "~/organisms/nav-bar";
import { Surface, Table } from "@heroui/react";

interface Indicator {
  studentId: string;
  studentName: string;
  corrects: number;
  progress: number;
  stumble: number;
  speed: number;
  prudence: number;
}

interface LoaderData {
  userName: string;
  courseName: string;
  indicators: readonly Indicator[];
}

export async function loader({
  context,
  params,
}: Route.LoaderArgs): Promise<Response | LoaderData> {
  const auth = context.get(AuthContext);
  if (auth.type !== "teacher") {
    return new Response(null, { status: 401 });
  }

  const { env } = context.get(CloudflareContext);
  const db = drizzle(env.e_quiz_db, { schema });

  const teacher = await db.query.teacher.findFirst({
    columns: { name: true },
    where: (teacher, { eq }) => eq(teacher.id, auth.id),
  });
  if (teacher == null) {
    return new Response(null, { status: 401 });
  }

  const course = await db.query.course.findFirst({
    columns: {
      name: true,
    },
    where: (course, { eq }) => eq(course.ownerId, auth.id),
  });
  if (course == null) {
    return new Response(null, { status: 404 });
  }

  const numbered = db.$with("numbered").as(
    db
      .select({
        quizId: schema.submission.sentToId,
        containerId: schema.quiz.containerId,
        studentId: schema.submission.createdById,
        studentName: schema.student.name,
        createdAt: schema.submission.createdAt,
        isCorrect: sql<number>`CASE WHEN ${schema.submission.answer} = ${schema.quiz.solution} THEN 1 ELSE 0 END`,
        attemptNum: sql<number>`ROW_NUMBER() OVER (
        PARTITION BY ${schema.submission.sentToId}, ${schema.submission.createdById}
        ORDER BY ${schema.submission.createdAt}
      )`,
      })
      .from(schema.submission)
      .innerJoin(schema.quiz, eq(schema.submission.sentToId, schema.quiz.id))
      .innerJoin(schema.enrollment, eq(schema.submission.createdById, schema.enrollment.studentId))
      .innerJoin(schema.student, eq(schema.enrollment.studentId, schema.student.id))
      .where(eq(schema.enrollment.courseId, params.course_id)),
  );
  const milestones = db.$with("studentMilestones").as(
    db
      .select({
        quizId: numbered.quizId,
        containerId: numbered.containerId,
        studentId: numbered.studentId,
        studentName: numbered.studentName,
        firstSubmitAt: sql<number>`MIN(${numbered.createdAt})`,
        firstCorrectAt: sql<number>`MIN(CASE WHEN ${numbered.isCorrect} = 1 THEN ${numbered.createdAt} END)`,
        nthAttempt: sql<number>`MIN(CASE WHEN ${numbered.isCorrect} = 1 THEN ${numbered.attemptNum} END)`,
        hasCorrect: sql<number>`MAX(${numbered.isCorrect})`,
      })
      .from(numbered)
      .groupBy(numbered.quizId, numbered.containerId, numbered.studentId),
  );
  const indicators = await db
    .with(numbered, milestones)
    .select({
      studentId: milestones.studentId,
      studentName: milestones.studentName,
      corrects: sql<number>`SUM(${milestones.hasCorrect})`,
      progress: sql<number>`CAST(SUM(${milestones.hasCorrect}) AS REAL) / COUNT(${milestones.quizId})`,
      stumble: sql<number>`AVG(
      CASE
        WHEN ${milestones.hasCorrect} = 1
        THEN CAST((${milestones.firstCorrectAt} - ${milestones.firstSubmitAt}) AS REAL) / NULLIF(${milestones.firstCorrectAt} - ${schema.firstView.createdAt}, 0)
      END
    )`,
      speed: sql<number>`AVG(
      CASE
        WHEN ${milestones.hasCorrect} = 1
        THEN CAST((${milestones.firstCorrectAt} - ${schema.firstView.createdAt}) AS REAL)
      END
    )`,
      prudence: sql<number>`AVG(
      CASE
        WHEN ${milestones.hasCorrect} = 1
        THEN CAST((${milestones.firstCorrectAt} - ${milestones.firstSubmitAt}) AS REAL) / ${milestones.nthAttempt}
      END
    )`,
    })
    .from(milestones)
    .leftJoin(
      schema.firstView,
      and(
        eq(milestones.studentId, schema.firstView.whoId),
        eq(milestones.containerId, schema.firstView.readId),
      ),
    )
    .groupBy(milestones.studentId);
  return { userName: teacher.name, courseName: course.name, indicators };
}

export default function StatsPage({
  loaderData: { userName, courseName, indicators },
}: Route.ComponentProps): React.JSX.Element {
  return (
    <>
      <title>{`${courseName} の統計 - e-Quiz`}</title>
      <div className="h-screen overflow-auto">
        <Surface className="sticky top-0 z-10 drop-shadow-md">
          <NavBar title={`${courseName} の統計`} user={{ type: "teacher", name: userName }} />
        </Surface>
        <div>
          <h2>ヒストグラム</h2>
          histogram…
        </div>
        <div>
          <h2>データ表</h2>
          <Table>
            <Table.ScrollContainer>
              <Table.Content>
                <Table.Header>
                  <Table.Column isRowHeader>受講者名</Table.Column>
                  <Table.Column>正解数</Table.Column>
                  <Table.Column>進捗</Table.Column>
                  <Table.Column>つまづき度</Table.Column>
                  <Table.Column>学習の速さ</Table.Column>
                  <Table.Column>回答の慎重さ</Table.Column>
                </Table.Header>
                <Table.Body>
                  {indicators.map(
                    ({ studentId, studentName, corrects, progress, stumble, speed, prudence }) => (
                      <Table.Row key={studentId}>
                        <Table.Cell>{studentName}</Table.Cell>
                        <Table.Cell>{corrects}</Table.Cell>
                        <Table.Cell>{progress}</Table.Cell>
                        <Table.Cell>{stumble}</Table.Cell>
                        <Table.Cell>{speed}</Table.Cell>
                        <Table.Cell>{prudence}</Table.Cell>
                      </Table.Row>
                    ),
                  )}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        </div>
      </div>
    </>
  );
}
