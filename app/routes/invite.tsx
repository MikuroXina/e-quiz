import { Button, Surface, Typography } from "@heroui/react";
import type { Route } from "./+types/invite";
import { CloudflareContext } from "~/lib/cloudflare";
import { AuthContext } from "~/lib/session";
import { Form, redirect } from "react-router";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../db/schema";
import { upsertEnrollment } from "~/repositories/enrollment";

export async function loader({ request, context }: Route.LoaderArgs) {
  const searchParams = new URL(request.url).searchParams;
  const courseId = searchParams.get("course_id");
  if (courseId == null || courseId === "") {
    return redirect("/");
  }

  const session = context.get(AuthContext);
  if (session.type !== "student") {
    const params = new URLSearchParams({
      back: "/invite?" + searchParams,
    });
    return redirect("/log_in?" + params);
  }

  const { env } = context.get(CloudflareContext);
  const db = drizzle(env.e_quiz_db, { schema });
  const course = await db.query.course.findFirst({
    columns: {
      id: true,
      name: true,
    },
    with: {
      owner: {
        columns: {
          name: true,
        },
      },
    },
    where: (course, { eq }) => eq(course.id, courseId),
  });
  if (course == null) {
    return redirect("/");
  }

  return { course };
}

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const courseId = formData.get("course_id");
  if (courseId == null || typeof courseId !== "string") {
    console.log("bad parameter: ", formData);
    return new Response(null, { status: 400 });
  }

  const auth = context.get(AuthContext);
  if (auth.type !== "student") {
    return new Response(null, { status: 403 });
  }

  const { env } = context.get(CloudflareContext);
  const db = drizzle(env.e_quiz_db);
  await upsertEnrollment(db, auth.id, courseId);
  return redirect("/");
}

export default function InvitePage({
  loaderData: { course },
}: Route.ComponentProps): React.JSX.Element {
  return (
    <>
      <title>招待確認</title>
      <div className="grid min-h-screen items-center justify-evenly">
        <Surface
          className="flex max-w-120 flex-col gap-3 rounded-xl p-6 outline-1 outline-solid"
          variant="default"
        >
          <Typography type="h1">招待確認</Typography>
          <p>
            教員 {course.owner.name} から講座「{course.name}」に招待されました
          </p>
          <p>この講座を受講しますか？</p>
          <div>
            <Form method="POST">
              <input type="hidden" name="course_id" value={course.id} />
              <Button type="submit">受講する</Button>
            </Form>
          </div>
          <p>受講しない場合はこの画面を閉じてください</p>
        </Surface>
      </div>
    </>
  );
}
