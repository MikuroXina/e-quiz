import { CloudflareContext } from "~/lib/cloudflare";
import type { Route } from "./+types/content";
import { Surface } from "@heroui/react";
import { drizzle } from "drizzle-orm/d1";
import { AuthContext } from "~/lib/session";
import { data, redirect, useSubmit } from "react-router";
import * as schema from "~/db/schema";
import { eq } from "drizzle-orm";
import { NavBar } from "~/organisms/nav-bar";
import * as v from "valibot";
import { ContentEditor } from "~/organisms/content-editor";
import { contentSchema, type Content } from "~/lib/content";
import { ContentView } from "~/organisms/content-view";
import { mdToHtml } from "~/lib/markdown";
import { upsertFirstView } from "~/repositories/first-view";
import { updateContent } from "~/repositories/content";

const choicesSchema = v.array(v.string());

type LoaderData =
  | {
      type: "teacher";
      userName: string;
      course: {
        id: string;
        name: string;
      };
      content: Content;
      previewHtml: string;
    }
  | {
      type: "student";
      userName: string;
      course: {
        id: string;
        name: string;
      };
      content: {
        id: string;
        title: string;
        quizzes: readonly {
          id: string;
          description: string;
          choices: readonly string[];
          answerStatus: boolean | null;
        }[];
      };
      previewHtml: string;
    };

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
  if (auth.type === "teacher") {
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
      return redirect(`/courses/${params.course_id}`);
    }

    const quizzesRes = await db.query.quiz.findMany({
      where: (quizzes, { eq }) => eq(quizzes.containerId, contentRes[0].contentId),
      orderBy: (quizzes, { asc }) => asc(quizzes.order),
    });
    const publishStateRes = await db.query.publishState.findFirst({
      where: (publishState, { eq }) => eq(publishState.contentId, contentRes[0].contentId),
    });

    const previewHtml = await mdToHtml(contentRes[0].contentBody);

    return {
      type: auth.type,
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
        publishState: publishStateRes
          ? { type: "PUBLISHED", publishedAt: publishStateRes.updatedAt }
          : { type: "UNPUBLISHED" },
      },
      previewHtml,
    };
  } else {
    const user = await db.query.student.findFirst({
      columns: { name: true },
      where: (student, { eq }) => eq(student.id, auth.id),
    });
    if (user == null) {
      return redirect(`/log_in?back=/courses/${params.course_id}/contents/${params.content_id}`);
    }

    const content = await db.query.content.findFirst({
      columns: {
        title: true,
        content: true,
      },
      with: {
        container: {
          columns: {
            id: true,
            name: true,
          },
        },
        quizzes: {
          columns: { id: true },
        },
      },
      where: (content, { eq }) => eq(content.id, params.content_id),
    });
    if (content == null) {
      return redirect(`/courses/${params.course_id}`);
    }
    const quizIds = content.quizzes.map(({ id }) => id);
    const quizzesRes = await db.query.quiz.findMany({
      columns: {
        id: true,
        description: true,
        choices: true,
        solution: true,
        answer: true,
      },
      with: {
        submissions: {
          columns: {
            answer: true,
          },
          where: (submission, { eq }) => eq(submission.createdById, auth.id),
          orderBy: (submission, { desc }) => desc(submission.createdAt),
          limit: 1,
        },
      },
      where: (quiz, { inArray }) => inArray(quiz.id, quizIds),
    });
    const quizzes = quizzesRes.map(({ id, description, choices, solution, submissions }) => ({
      id,
      description,
      choices: v.parse(choicesSchema, JSON.parse(choices)),
      answerStatus: submissions.length === 0 ? null : solution === submissions[0].answer,
    }));

    await upsertFirstView(db, auth.id, params.content_id);

    const previewHtml = await mdToHtml(content.content);

    return {
      type: auth.type,
      userName: user.name,
      course: content.container,
      content: {
        id: params.content_id,
        title: content.title,
        quizzes,
      },
      previewHtml,
    };
  }
}

const submitSchema = v.object({
  course_id: v.string(),
  new_content: v.pipe(v.string(), v.parseJson(), contentSchema),
});

export async function action({ request, context }: Route.ActionArgs) {
  const auth = context.get(AuthContext);
  if (auth.type !== "teacher") {
    return data({ success: false }, { status: 403 });
  }

  const formData = Object.fromEntries(await request.formData());
  const bodyRes = v.safeParse(submitSchema, formData);
  if (!bodyRes.success) {
    console.log("bad parameter: ", bodyRes.issues[0]);
    return data({ success: false }, { status: 400 });
  }
  const body = bodyRes.output;

  const { env } = context.get(CloudflareContext);
  const db = drizzle(env.e_quiz_db);

  const res = await updateContent(db, auth.id, body.new_content);

  if (!res.success) {
    console.log("target is not created by the authorized user: ", auth);
    return data({ success: false }, { status: 400 });
  }
  return { success: true };
}

export default function ContentPage({
  loaderData,
  actionData,
}: Route.ComponentProps): React.JSX.Element {
  const submit = useSubmit();
  const save = async (newContent: Content) => {
    const data = new FormData();
    data.append("course_id", loaderData.course.id);
    data.append("new_content", JSON.stringify(newContent));
    await submit(data, { method: "POST", encType: "multipart/form-data" });
    return { success: true } as const;
  };
  const answer = async (quizId: string, answer: number) => {
    const formData = new FormData();
    formData.append("answer", answer.toString());
    await submit(formData, {
      action: `/courses/${loaderData.course.id}/contents/${loaderData.content.id}/quizzes/${quizId}`,
      method: "POST",
      encType: "multipart/form-data",
      navigate: false,
    });
  };

  return (
    <>
      <title>{`コンテンツ ${loaderData.content.title} - e-Quiz`}</title>
      <div className="h-screen overflow-auto">
        <Surface className="sticky top-0 z-10 drop-shadow-md">
          <NavBar
            title={`コンテンツ ${loaderData.content.title}`}
            user={{ type: loaderData.type, name: loaderData.userName }}
          />
        </Surface>
        <div className="h-full p-4">
          {loaderData.type === "teacher" ? (
            <ContentEditor
              content={loaderData.content}
              previewHtml={loaderData.previewHtml}
              saveError={actionData?.success === false}
              onSave={save}
            />
          ) : (
            <ContentView
              quizzes={loaderData.content.quizzes}
              previewHtml={loaderData.previewHtml}
              onSubmit={answer}
            />
          )}
        </div>
      </div>
    </>
  );
}
