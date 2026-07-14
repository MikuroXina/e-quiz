import { Button, Card, EmptyState, Typography } from "@heroui/react";
import { Link } from "react-router";
import type { Route } from "./+types/home";
import { AuthContext } from "~/lib/session";
import { CloudflareContext } from "~/lib/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";
import { eq } from "drizzle-orm";
import * as v from "valibot";
import { CopyInviteLink } from "~/organisms/copy-invite-link";
import { Template } from "~/organisms/template";
import { AddCourseButton } from "~/organisms/add-course-button";
import { EditCourseNameButton } from "~/organisms/edit-course-name-button";
import PersonMagnifier from "@gravity-ui/icons/PersonMagnifier";

interface Course {
  id: string;
  name: string;
}

type LoaderData =
  | {
      type: "unauthorized";
    }
  | { type: "teacher"; name: string; courses: readonly Course[] }
  | { type: "student"; name: string; courses: readonly Course[] };

export async function loader({ context }: Route.LoaderArgs): Promise<LoaderData> {
  const { env } = context.get(CloudflareContext);
  const auth = context.get(AuthContext);
  const db = drizzle(env.e_quiz_db, { schema });

  switch (auth.type) {
    case "unauthorized":
      return { type: "unauthorized" };
    case "teacher":
      const teacher = await db.query.teacher.findFirst({
        columns: { name: true },
        with: {
          courses: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
        where: (teacher, { eq }) => eq(teacher.id, auth.id),
      });
      if (teacher == null) {
        return { type: "unauthorized" };
      }
      return { type: "teacher", ...teacher };
    case "student":
      const student = await db.query.student.findFirst({
        columns: { name: true },
        with: {
          enrollments: {
            columns: {},
            with: {
              course: {
                columns: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        where: (student, { eq }) => eq(student.id, auth.id),
      });
      if (student == null) {
        return { type: "unauthorized" };
      }
      return {
        type: "student",
        ...student,
        courses: student.enrollments.map(({ course }) => course),
      };
  }
}

const postCourseSchema = v.object({
  name: v.pipe(v.string(), v.nonEmpty()),
});

const putCourseSchema = v.object({
  course_id: v.pipe(v.string(), v.nonEmpty()),
  course_name: v.pipe(v.string(), v.nonEmpty()),
});

export async function action({ request, context }: Route.ActionArgs) {
  const auth = context.get(AuthContext);
  if (auth.type !== "teacher") {
    return new Response(null, { status: 403 });
  }

  const form = Object.fromEntries(await request.formData());
  if (request.method === "PUT") {
    const parseRes = v.safeParse(putCourseSchema, form);
    if (!parseRes.success) {
      console.log("bad parameter: ", form);
      return new Response(null, { status: 400 });
    }
    const body = parseRes.output;

    const { env } = context.get(CloudflareContext);
    const db = drizzle(env.e_quiz_db, { schema });
    const target = await db.query.course.findFirst({
      columns: { id: true },
      where: (course, { eq, and }) =>
        and(eq(course.id, body.course_id), eq(course.ownerId, auth.id)),
    });
    if (target == null) {
      console.log("target is not created by the authorized user: ", auth);
      return new Response(null, { status: 400 });
    }
    try {
      await db
        .update(schema.course)
        .set({
          name: body.course_name,
        })
        .where(eq(schema.course.id, body.course_id))
        .execute();
      return { success: true };
    } catch (err: unknown) {
      console.log("failed to change name of the course: ", err);
      return new Response(null, { status: 500 });
    }
  }

  const parseRes = v.safeParse(postCourseSchema, form);
  if (!parseRes.success) {
    console.log("bad parameter: ", form);
    return new Response(null, { status: 400 });
  }
  const body = parseRes.output;

  const { env } = context.get(CloudflareContext);
  const db = drizzle(env.e_quiz_db);
  const newId = crypto.randomUUID();
  try {
    await db
      .insert(schema.course)
      .values({
        id: newId,
        name: body.name,
        ownerId: auth.id,
      })
      .execute();
    return { success: true };
  } catch (err: unknown) {
    console.log("failed to add a new course: ", err);
    return new Response(null, { status: 500 });
  }
}

export default function Home({ loaderData }: Route.ComponentProps): React.JSX.Element {
  return (
    <Template title="ホーム" user={loaderData}>
      {" "}
      <div className="flex justify-between">
        <Typography type="h2">講座一覧</Typography>
        {loaderData.type === "teacher" && <AddCourseButton />}
      </div>
      <div className="flex flex-col gap-2">
        {loaderData.type === "unauthorized" ? (
          <EmptyState>右上の「ログイン」ボタンからログインしましょう</EmptyState>
        ) : loaderData.courses.length === 0 ? (
          loaderData.type === "teacher" ? (
            <EmptyState>「講座を新規追加」ボタンから講座を追加しましょう</EmptyState>
          ) : (
            <EmptyState>教員から講座の招待リンクを受け取ってそれを開きましょう</EmptyState>
          )
        ) : (
          loaderData.courses.map(({ id, name }) => (
            <Card key={id}>
              <Card.Content>
                <div className="flex justify-between">
                  <Link to={`/courses/${id}`}>
                    <Typography type="h3">{name}</Typography>
                  </Link>
                  <div className="flex items-center gap-2">
                    {loaderData.type === "teacher" && (
                      <>
                        <CopyInviteLink courseId={id} />
                        <Link to={`/courses/${id}/stats`}>
                          <Button variant="secondary" isIconOnly>
                            <PersonMagnifier />
                          </Button>
                        </Link>
                        <EditCourseNameButton courseId={id} oldName={name} />
                      </>
                    )}
                    <Link to={`/courses/${id}`}>
                      <Button variant="ghost">開く</Button>
                    </Link>
                  </div>
                </div>
              </Card.Content>
            </Card>
          ))
        )}
      </div>
    </Template>
  );
}
