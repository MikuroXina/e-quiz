import { AuthContext } from "~/lib/session";
import type { Route } from "./+types/course";
import { Link, redirect, useSubmit } from "react-router";
import { drizzle } from "drizzle-orm/d1";
import { CloudflareContext } from "~/lib/cloudflare";
import * as schema from "~/db/schema";
import { and, eq } from "drizzle-orm";
import { Button, Card, EmptyState, Surface, Typography } from "@heroui/react";
import { NavBar } from "~/organisms/nav-bar";
import * as v from "valibot";
import type { PublishState } from "~/lib/content";
import { PublishStateSelector } from "~/organisms/publish-state-selector";
import { CopyInviteLink } from "~/organisms/copy-invite-link";
import { EditContentTitleButton } from "~/organisms/edit-content-title-button";
import { AddContentButton } from "~/organisms/add-content-button";

interface Content {
  id: string;
  title: string;
  publishState: PublishState;
}

interface LoaderData {
  user: { type: "student" | "teacher"; name: string };
  course: { id: string; name: string };
  contents: readonly Content[];
}

export async function loader({
  params: { course_id },
  context,
}: Route.LoaderArgs): Promise<Response | LoaderData> {
  const auth = context.get(AuthContext);
  const redirectToLoginAndBack = redirect(`/log_in?back=/courses/${course_id}`);
  if (auth.type === "unauthorized") {
    return redirectToLoginAndBack;
  }

  const { env } = context.get(CloudflareContext);
  const db = drizzle(env.e_quiz_db, { schema });
  switch (auth.type) {
    case "student": {
      const student = await db.query.student.findFirst({
        columns: { name: true },
        where: (student, { eq }) => eq(student.id, auth.id),
      });
      const course = await db.query.course.findFirst({
        columns: { name: true },
        where: (course, { eq }) => eq(course.id, course_id),
      });
      const contents = await db
        .select({
          id: schema.content.id,
          title: schema.content.title,
          publishedAt: schema.publishState.updatedAt,
        })
        .from(schema.content)
        .leftJoin(schema.publishState, eq(schema.content.id, schema.publishState.contentId))
        .where(eq(schema.publishState.state, "PUBLISHED"));
      if (student == null || course == null) {
        return redirectToLoginAndBack;
      }

      return {
        user: { type: "student", name: student.name },
        course: { id: course_id, name: course.name },
        contents: contents.map(
          (content) =>
            ({
              ...content,
              publishState: { type: "PUBLISHED", publishedAt: content.publishedAt },
            }) as Content,
        ),
      };
    }
    case "teacher": {
      const teacher = await db.query.teacher.findFirst({
        columns: { name: true },
        where: (teacher, { eq }) => eq(teacher.id, auth.id),
      });
      if (teacher == null) {
        return redirectToLoginAndBack;
      }
      const course = await db.query.course.findFirst({
        with: {
          contents: {
            columns: { id: true, title: true },
            with: {
              publishState: {
                columns: {
                  state: true,
                  updatedAt: true,
                },
              },
            },
          },
        },
        where: (course, { eq, and }) => and(eq(course.id, course_id), eq(course.ownerId, auth.id)),
      });
      if (course == null) {
        return new Response(null, {
          status: 404,
        });
      }

      return {
        user: { type: "teacher", name: teacher.name },
        course,
        contents: course.contents.map((content) => ({
          ...content,
          publishState:
            content.publishState?.state === "PUBLISHED"
              ? { type: "PUBLISHED", publishedAt: content.publishState.updatedAt }
              : { type: "UNPUBLISHED" },
        })),
      };
    }
  }
}

const postContentSchema = v.object({
  name: v.pipe(v.string(), v.nonEmpty()),
  container: v.pipe(v.string(), v.nonEmpty()),
});

const putContentSchema = v.variant("type", [
  v.object({
    type: v.literal("SET_TITLE"),
    content_id: v.pipe(v.string(), v.nonEmpty()),
    content_title: v.pipe(v.string(), v.nonEmpty()),
  }),
  v.object({
    type: v.literal("SET_PUBLISH_STATE"),
    content_id: v.pipe(v.string(), v.nonEmpty()),
    state: v.union([v.literal("PUBLISHED"), v.literal("UNPUBLISHED")]),
  }),
]);

export async function action({ request, context }: Route.ActionArgs) {
  const auth = context.get(AuthContext);
  if (auth.type !== "teacher") {
    return new Response(null, { status: 403 });
  }

  const formData = Object.fromEntries((await request.formData()).entries());
  if (request.method === "PUT") {
    const bodyRes = v.safeParse(putContentSchema, formData);
    if (!bodyRes.success) {
      console.log("bad parameter", bodyRes.issues);
      return new Response(null, { status: 400 });
    }
    const body = bodyRes.output;

    const { env } = context.get(CloudflareContext);
    const db = drizzle(env.e_quiz_db, { schema });
    const target = await db
      .select({ id: schema.content.id })
      .from(schema.content)
      .innerJoin(schema.course, eq(schema.content.containerId, schema.course.id))
      .innerJoin(schema.teacher, eq(schema.course.ownerId, schema.teacher.id))
      .where(and(eq(schema.content.id, body.content_id), eq(schema.teacher.id, auth.id)))
      .limit(1);
    if (target.length === 0) {
      console.log("target is not created by the authorized user: ", auth);
      return new Response(null, { status: 400 });
    }
    try {
      switch (body.type) {
        case "SET_TITLE":
          await db
            .update(schema.content)
            .set({ title: body.content_title })
            .where(eq(schema.content.id, body.content_id))
            .execute();
          break;
        case "SET_PUBLISH_STATE":
          await db
            .insert(schema.publishState)
            .values({
              contentId: body.content_id,
              state: body.state,
              updatedAt: new Date().toISOString(),
            })
            .onConflictDoUpdate({
              target: schema.publishState.contentId,
              set: {
                state: body.state,
                updatedAt: new Date().toISOString(),
              },
            });
          break;
      }
      return { success: true };
    } catch (err: unknown) {
      console.log("failed to update title of the content: ", err);
      return new Response(null, { status: 500 });
    }
  }

  const bodyRes = v.safeParse(postContentSchema, formData);
  if (!bodyRes.success) {
    console.log("bad parameter: ", bodyRes.issues);
    return new Response(null, { status: 400 });
  }
  const body = bodyRes.output;

  const { env } = context.get(CloudflareContext);
  const db = drizzle(env.e_quiz_db);
  const newId = crypto.randomUUID();
  try {
    await db
      .insert(schema.content)
      .values({
        id: newId,
        containerId: body.container,
        title: body.name,
        content: "",
      })
      .execute();
    return { success: true };
  } catch (err: unknown) {
    console.log("failed to insert a new content: ", body);
    return new Response(null, { status: 500 });
  }
}

export default function Course({
  loaderData: { user, course, contents },
}: Route.ComponentProps): React.JSX.Element {
  const submit = useSubmit();
  const onChangePublishState = (contentId: string) => (value: PublishState["type"]) => {
    const formData = new FormData();
    formData.append("type", "SET_PUBLISH_STATE");
    formData.append("content_id", contentId);
    formData.append("state", value);
    submit(formData, { method: "PUT" });
  };

  return (
    <>
      <title>{`講座 ${course.name} - e-Quiz`}</title>
      <div className="h-screen overflow-auto">
        <Surface className="sticky top-0 z-10 drop-shadow-md">
          <NavBar title={`講座 ${course.name}`} user={user} />
        </Surface>
        <div className="flex h-full flex-col gap-4 p-4">
          <div className="flex justify-between">
            <Typography type="h2">コンテンツ一覧</Typography>
            <div className="flex gap-2">
              {user.type === "teacher" && (
                <>
                  <CopyInviteLink courseId={course.id} />
                  <AddContentButton courseId={course.id} />
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {contents.length === 0 ? (
              user.type === "student" ? (
                <EmptyState>まだ公開されているコンテンツがありません</EmptyState>
              ) : (
                <EmptyState>
                  「コンテンツを新規追加」ボタンからコンテンツを追加しましょう
                </EmptyState>
              )
            ) : (
              contents.map(({ id, title, publishState }) => (
                <Card key={id}>
                  <Card.Content>
                    <div className="flex justify-between">
                      <Link to={`/courses/${course.id}/contents/${id}`}>
                        <Typography type="h3">{title}</Typography>
                      </Link>
                      <div className="flex items-center gap-2">
                        {user.type === "teacher" && (
                          <>
                            <PublishStateSelector
                              publishState={publishState}
                              onChange={onChangePublishState(id)}
                            />
                            <EditContentTitleButton contentId={id} oldTitle={title} />
                          </>
                        )}
                        <Link to={`/courses/${course.id}/contents/${id}`}>
                          <Button variant="ghost">開く</Button>
                        </Link>
                      </div>
                    </div>
                  </Card.Content>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
