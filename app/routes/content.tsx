import { CloudflareContext } from "~/lib/cloudflare";
import type { Route } from "./+types/content";
import { Surface, TextArea } from "@heroui/react";
import { drizzle } from "drizzle-orm/d1";
import { AuthContext } from "~/lib/session";
import { redirect } from "react-router";
import { content, course, teacher } from "~/db/schema";
import { eq } from "drizzle-orm";
import { NavBar } from "~/organisms/nav-bar";

type LoaderData = {
  userName: string;
  course: {
    id: string;
    name: string;
  };
  content: {
    id: string;
    title: string;
    body: string;
  };
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
  const db = drizzle(env.e_quiz_db);

  const userRes = await db
    .select({ name: teacher.name })
    .from(teacher)
    .where(eq(teacher.id, auth.id))
    .limit(1);
  if (userRes.length === 0) {
    return redirect(`/log_in?back=/courses/${params.course_id}/contents/${params.content_id}`);
  }

  const queries = await db
    .select({
      courseId: course.id,
      courseName: course.name,
      contentId: content.id,
      contentTitle: content.title,
      contentBody: content.content,
    })
    .from(content)
    .innerJoin(course, eq(content.container, course.id))
    .where(eq(course.owner, auth.id))
    .limit(1);

  if (queries.length === 0) {
    return new Response(null, { status: 404 });
  }
  const [query] = queries;
  return {
    userName: userRes[0].name,
    course: {
      id: query.courseId,
      name: query.courseName,
    },
    content: {
      id: query.contentId,
      title: query.contentTitle,
      body: query.contentBody,
    },
  };
}

export default function Content({ loaderData }: Route.ComponentProps): React.JSX.Element {
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
          <div>
            <TextArea defaultValue={loaderData.content.body} />
          </div>
        </div>
      </div>
    </>
  );
}
