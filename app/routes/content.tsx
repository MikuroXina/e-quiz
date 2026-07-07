import { CloudflareContext } from "~/lib/cloudflare";
import type { Route } from "./+types/content";
import { Button, Label, Surface, TextArea } from "@heroui/react";
import { drizzle } from "drizzle-orm/d1";
import { AuthContext } from "~/lib/session";
import { redirect, useFetcher } from "react-router";
import { content, course } from "~/db/schema";
import * as schema from "~/db/schema";
import { eq } from "drizzle-orm";
import { NavBar } from "~/organisms/nav-bar";
import * as v from "valibot";
import { useEffect, useState } from "react";

const choicesSchema = v.array(v.string());

interface Quiz {
  id: string;
  description: string;
  solution: number;
  choices: readonly string[];
}

interface LoaderData {
  userName: string;
  course: {
    id: string;
    name: string;
  };
  content: {
    id: string;
    title: string;
    body: string;
    quizzes: readonly Quiz[];
  };
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
      courseId: course.id,
      courseName: course.name,
      contentId: content.id,
      contentTitle: content.title,
      contentBody: content.content,
    })
    .from(content)
    .innerJoin(course, eq(content.containerId, course.id))
    .where(eq(course.ownerId, auth.id))
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
      id: contentRes[0].contentId,
      title: contentRes[0].contentTitle,
      body: contentRes[0].contentBody,
      quizzes: quizzesRes.map(({ id, description, solution, choices }) => ({
        id,
        description,
        solution,
        choices: v.parse(choicesSchema, JSON.parse(choices)),
      })),
    },
  };
}

const putBodySchema = v.object({
  content_id: v.pipe(v.string(), v.nonEmpty()),
  content_body: v.string(),
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
  const bodyRes = v.safeParse(putBodySchema, formData);
  if (!bodyRes.success) {
    console.log("bad parameter: ", bodyRes.issues);
    return new Response(null, { status: 400 });
  }
  const body = bodyRes.output;

  const { env } = context.get(CloudflareContext);
  const db = drizzle(env.e_quiz_db);
  try {
    await db
      .update(content)
      .set({
        content: body.content_body,
      })
      .where(eq(content.id, body.content_id))
      .execute();
    return { success: true };
  } catch (err: unknown) {
    console.log("failed to update body of the content: ", err);
    return new Response(null, { status: 500 });
  }
}

export default function Content({ loaderData }: Route.ComponentProps): React.JSX.Element {
  const [isSaved, setIsSaved] = useState(true);
  const fetcher = useFetcher<ActionResponse>({ key: "content" });

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data === null) {
      // reactivate save button when failed to save
      setIsSaved(false);
    }
  }, [fetcher.state, fetcher.data]);

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
          <fetcher.Form method="PUT" onSubmit={() => setIsSaved(true)}>
            <input type="hidden" name="content_id" value={loaderData.content.id} />
            <div className="mb-2">
              <Button type="submit" isDisabled={isSaved}>
                保存
              </Button>
            </div>
            <div>
              <Label>
                本文
                <TextArea
                  className="outline outline-gray-200 outline-solid"
                  name="content_body"
                  placeholder={"# 見出し 1\n…"}
                  onInput={() => setIsSaved(false)}
                  defaultValue={loaderData.content.body}
                  rows={16}
                  fullWidth
                />
              </Label>
            </div>
          </fetcher.Form>
        </div>
      </div>
    </>
  );
}
