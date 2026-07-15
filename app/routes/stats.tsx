import { Chart, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import { AuthContext } from "~/lib/session";
import type { Route } from "./+types/stats";
import { CloudflareContext } from "~/lib/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { Button, Disclosure, DisclosureGroup, Typography } from "@heroui/react";
import { Template } from "~/organisms/template";
import { Histogram } from "~/organisms/histogram";
import { redirect } from "react-router";
import { useState } from "react";
import type { Indicator } from "~/lib/model";
import { StatsTable } from "~/organisms/stats-table";
import { HistogramDisclosure } from "~/organisms/histogram-disclosure";

Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

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
    return redirect("/");
  }

  const { env } = context.get(CloudflareContext);
  const db = drizzle(env.e_quiz_db, { schema });

  const teacher = await db.query.teacher.findFirst({
    columns: { name: true },
    where: (teacher, { eq }) => eq(teacher.id, auth.id),
  });
  if (teacher == null) {
    return redirect("/");
  }

  const course = await db.query.course.findFirst({
    columns: {
      name: true,
    },
    where: (course, { eq }) => eq(course.ownerId, auth.id),
  });
  if (course == null) {
    return redirect("/courses");
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
  const [expandedKeys, setExpandedKeys] = useState(new Set<string | number>());

  return (
    <Template title={`${courseName} の統計`} user={{ type: "teacher", name: userName }}>
      <div>
        <Typography type="h2">ヒストグラム</Typography>
        <DisclosureGroup expandedKeys={expandedKeys} onExpandedChange={setExpandedKeys}>
          <HistogramDisclosure
            id="stumble"
            label="つまづき度"
            nums={indicators.map(({ stumble }) => stumble).filter((value) => value !== null)}
          />
          <HistogramDisclosure
            id="speed"
            label="学習の速さ"
            nums={indicators.map(({ speed }) => speed).filter((value) => value !== null)}
          />
          <HistogramDisclosure
            id="prudence"
            label="学習の慎重さ"
            nums={indicators.map(({ prudence }) => prudence).filter((value) => value !== null)}
          />
        </DisclosureGroup>
      </div>
      <div>
        <Typography type="h2">データ表</Typography>
        <StatsTable indicators={indicators} />
      </div>
    </Template>
  );
}
