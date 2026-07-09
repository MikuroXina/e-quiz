import { CloudflareContext } from "~/lib/cloudflare";
import type { Route } from "./+types/content";
import { Surface } from "@heroui/react";
import { drizzle } from "drizzle-orm/d1";
import { AuthContext } from "~/lib/session";
import { redirect, useSubmit } from "react-router";
import * as schema from "~/db/schema";
import { eq } from "drizzle-orm";
import { NavBar } from "~/organisms/nav-bar";
import * as v from "valibot";
import { ContentEditor } from "~/organisms/content-editor";
import { contentSchema, type Content } from "~/lib/content";

const choicesSchema = v.array(v.string());

interface LoaderData {
  userName: string;
  course: {
    id: string;
    name: string;
  };
  content: Content;
}

export async function loader({
  params,
  context,
}: Route.LoaderArgs): Promise<Response | LoaderData> {
  const auth = context.get(AuthContext);
  if (auth.type === "unauthorized") {
    return redirect(`/log_in?back=/courses/${params.course_id}/contents/${params.content_id}`);
  }

  const { env } = context.get(CloudflareContext);
  const db = drizzle(env.e_quiz_db, { schema });
  const user = await db.query.teacher.findFirst({
    columns: {
      name: true,
    },
    where: (teacher, { eq }) => eq(teacher.id, auth.id),
  });
  if (user == null) {
    return redirect(`/log_in?back=/courses/${params.course_id}/contents/${params.content_id}`);
  }

  const contentRes = await db
    .select({
      courseId: schema.course.id,
      courseName: schema.course.name,
      contentId: schema.content.id,
      contentTitle: schema.content.title,
      contentBody: schema.content.content,
    })
    .from(schema.content)
    .innerJoin(schema.course, eq(schema.content.containerId, schema.course.id))
    .where(eq(schema.course.ownerId, auth.id))
    .limit(1);

  if (contentRes.length === 0) {
    return new Response(null, { status: 404 });
  }

  const quizzesRes = await db.query.quiz.findMany({
    where: (quizzes, { eq }) => eq(quizzes.containerId, contentRes[0].contentId),
    orderBy: (quizzes, { asc }) => asc(quizzes.order),
  });

  return {
    userName: user.name,
    course: {
      id: contentRes[0].courseId,
      name: contentRes[0].courseName,
    },
    content: {
      id: contentRes[0].contentId as string & v.Brand<"Content">,
      title: contentRes[0].contentTitle,
      body: contentRes[0].contentBody,
      quizzes: quizzesRes.map(({ id, description, solution, choices }) => ({
        id: id as string & v.Brand<"Quiz">,
        description,
        solution,
        choices: v.parse(choicesSchema, JSON.parse(choices)),
      })),
    },
  };
}

const submitSchema = v.object({
  course_id: v.string(),
  new_content: contentSchema,
});

type ActionResponse = { success: true };

export async function action({
  request,
  context,
}: Route.ActionArgs): Promise<Response | ActionResponse> {
  const auth = context.get(AuthContext);
  if (auth.type === "unauthorized") {
    return new Response(null, { status: 403 });
  }

  const formData = Object.fromEntries(await request.formData());
  const bodyRes = v.safeParse(submitSchema, formData);
  if (!bodyRes.success) {
    console.log("bad parameter: ", bodyRes.issues[0]);
    return new Response(null, { status: 400 });
  }
  const body = bodyRes.output;

  const { env } = context.get(CloudflareContext);
  const db = drizzle(env.e_quiz_db);
  const target = await db
    .select({ id: schema.content.id })
    .from(schema.content)
    .innerJoin(schema.course, eq(schema.content.containerId, schema.course.id))
    .innerJoin(schema.teacher, eq(schema.course.ownerId, auth.id))
    .where(eq(schema.content.id, body.new_content.id))
    .limit(1);
  if (target.length === 0) {
    console.log("target is not created by the authorized user: ", auth);
    return new Response(null, { status: 400 });
  }
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(schema.content)
        .set({
          content: body.new_content.body,
        })
        .where(eq(schema.content.id, body.new_content.id))
        .execute();
      for (const [i, quiz] of body.new_content.quizzes.entries()) {
        await tx
          .update(schema.quiz)
          .set({
            order: i,
            description: quiz.description,
            solution: quiz.solution,
            choices: JSON.stringify(quiz.choices),
          })
          .where(eq(schema.quiz.id, quiz.id))
          .execute();
      }
    });
    return { success: true };
  } catch (err: unknown) {
    console.log("failed to update body of the content: ", err);
    return new Response(null, { status: 500 });
  }
}

export default function ContentPage({ loaderData }: Route.ComponentProps): React.JSX.Element {
  const submit = useSubmit();
  const save = async (newContent: Content) => {
    const data = new FormData();
    data.append("course_id", loaderData.course.id);
    data.append("new_content", JSON.stringify(newContent));
    await submit(data, { method: "POST", encType: "multipart/form-data" });
    return { success: true } as const;
  };

  return (
    <>
      <title>{`コンテンツ ${loaderData.content.title} - e-Quiz`}</title>
      <div className="h-screen overflow-auto">
        <Surface className="sticky top-0 z-10 drop-shadow-md">
          <NavBar
            title={`コンテンツ ${loaderData.content.title}`}
            user={{ type: "teacher", name: loaderData.userName }}
          />
        </Surface>
        <div className="h-full p-4">
          <ContentEditor content={loaderData.content} onSave={save} />
        </div>
      </div>
    </>
  );
}
