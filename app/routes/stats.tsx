import { Chart, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import { Bar } from "react-chartjs-2";
import { AuthContext } from "~/lib/session";
import type { Route } from "./+types/stats";
import { CloudflareContext } from "~/lib/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { EmptyState, Table } from "@heroui/react";
import { Template } from "~/organisms/template";
import { Histogram } from "~/organisms/histogram";

Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Indicator {
  studentId: string;
  studentName: string;
  corrects: number;
  progress: number;
  stumble: number | null;
  speed: number | null;
  prudence: number | null;
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
        isCorrect:
          sql<number>`CASE WHEN ${schema.submission.answer} = ${schema.quiz.solution} THEN 1 ELSE 0 END`.as(
            "isCorrect",
          ),
        attemptNum: sql<number>`ROW_NUMBER() OVER (
        PARTITION BY ${schema.submission.sentToId}, ${schema.submission.createdById}
        ORDER BY ${schema.submission.createdAt}
      )`.as("attemptNum"),
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
        firstSubmitAt: sql<number>`MIN(${numbered.createdAt})`.as("firstSubmitAt"),
        firstCorrectAt:
          sql<number>`MIN(CASE WHEN ${numbered.isCorrect} = 1 THEN ${numbered.createdAt} END)`.as(
            "firstCorrectAt",
          ),
        nthAttempt:
          sql<number>`MIN(CASE WHEN ${numbered.isCorrect} = 1 THEN ${numbered.attemptNum} END)`.as(
            "nthAttempt",
          ),
        hasCorrect: sql<number>`MAX(${numbered.isCorrect})`.as("hasCorrect"),
      })
      .from(numbered)
      .groupBy(numbered.quizId, numbered.containerId, numbered.studentId),
  );
  const indicators = await db
    .with(numbered, milestones)
    .select({
      studentId: milestones.studentId,
      studentName: milestones.studentName,
      corrects: sql<number>`SUM(${milestones.hasCorrect})`.as("corrects"),
      progress:
        sql<number>`CAST(SUM(${milestones.hasCorrect}) AS REAL) / COUNT(${milestones.quizId})`.as(
          "progress",
        ),
      stumble: sql<number>`AVG(
        CASE
          WHEN ${milestones.hasCorrect} = 1
          THEN CAST((${milestones.firstCorrectAt} - ${milestones.firstSubmitAt}) AS REAL) / NULLIF(${milestones.firstCorrectAt} - ${schema.firstView.createdAt}, 0)
        END
      )`.as("stumble"),
      speed: sql<number>`AVG(
        CASE
          WHEN ${milestones.hasCorrect} = 1
          THEN CAST((${milestones.firstCorrectAt} - ${schema.firstView.createdAt}) AS REAL)
        END
      )`.as("speed"),
      prudence: sql<number>`AVG(
        CASE
          WHEN ${milestones.hasCorrect} = 1
          THEN CAST((${milestones.firstCorrectAt} - ${milestones.firstSubmitAt}) AS REAL) / ${milestones.nthAttempt}
        END
      )`.as("prudence"),
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
    <Template title={`${courseName} の統計`} user={{ type: "teacher", name: userName }}>
      <div>
        <h2>ヒストグラム</h2>
        <div>
          <Histogram
            nums={indicators.flatMap(({ stumble }) => (stumble == null ? [] : [stumble]))}
            label="つまづき度"
            bins={8}
          />
        </div>
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
              <Table.Body
                renderEmptyState={() => (
                  <EmptyState className="flex h-full w-full flex-col items-center justify-center gap-4 text-center">
                    <span className="text-muted text-sm">まだ受講者が居ません</span>
                  </EmptyState>
                )}
              >
                {indicators.map(
                  ({ studentId, studentName, corrects, progress, stumble, speed, prudence }) => (
                    <Table.Row key={studentId}>
                      <Table.Cell>{studentName}</Table.Cell>
                      <Table.Cell>{corrects}</Table.Cell>
                      <Table.Cell>{progress}</Table.Cell>
                      <Table.Cell>{stumble == null ? "-" : stumble.toFixed(3)}</Table.Cell>
                      <Table.Cell>{speed == null ? "-" : speed.toPrecision(3)}</Table.Cell>
                      <Table.Cell>{prudence == null ? "-" : prudence.toPrecision(3)}</Table.Cell>
                    </Table.Row>
                  ),
                )}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </div>
    </Template>
  );
}
