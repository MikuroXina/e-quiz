import { AuthContext } from "~/lib/session";
import type { Route } from "./+types/course";
import { redirect, useFetcher } from "react-router";
import { drizzle } from "drizzle-orm/d1";
import { CloudflareContext } from "~/lib/cloudflare";
import { content, course, teacher } from "~/db/schema";
import { and, eq } from "drizzle-orm";
import { Button, Card, EmptyState, Input, Label, Modal, Surface, Typography } from "@heroui/react";
import { NavBar } from "~/organisms/nav-bar";
import * as v from "valibot";

interface Content {
  id: string;
  title: string;
}

interface LoaderData {
  userName: string;
  course: { id: string; name: string };
  contents: readonly Content[];
}

export async function loader({
  params: { course_id },
  context,
}: Route.LoaderArgs): Promise<Response | LoaderData> {
  const auth = context.get(AuthContext);
  if (auth.type === "unauthorized") {
    return redirect(`/log-in?back=/courses/${course_id}`);
  }

  const { env } = context.get(CloudflareContext);
  const db = drizzle(env.e_quiz_db);
  const teacherRes = await db.select({ name: teacher.name }).from(teacher).limit(1);
  const courseRes = await db
    .select({
      id: course.id,
      name: course.name,
    })
    .from(course)
    .where(and(eq(course.id, course_id), eq(course.owner, auth.id)))
    .limit(1);
  if (courseRes.length === 0) {
    return new Response(null, {
      status: 404,
    });
  }

  const contents = await db
    .select({ id: content.id, title: content.title })
    .from(content)
    .where(eq(content.container, courseRes[0].id));

  return { userName: teacherRes[0].name, course: courseRes[0], contents };
}

const postContentSchema = v.object({
  name: v.pipe(v.string(), v.nonEmpty()),
  container: v.pipe(v.string(), v.nonEmpty()),
});

export async function action({ request, context }: Route.ActionArgs) {
  const auth = context.get(AuthContext);
  if (auth.type === "unauthorized") {
    return new Response(null, { status: 403 });
  }

  const formData = await request.formData();
  const bodyRes = v.safeParse(postContentSchema, Object.fromEntries(formData.entries()));
  if (!bodyRes.success) {
    console.log("bad parameter: ", bodyRes.issues);
    return { success: false };
  }
  const body = bodyRes.output;

  const { env } = context.get(CloudflareContext);
  const db = drizzle(env.e_quiz_db);
  const newId = crypto.randomUUID();
  try {
    await db
      .insert(content)
      .values({
        id: newId,
        container: body.container,
        title: body.name,
        content: "",
      })
      .execute();
    return { success: true };
  } catch (err: unknown) {
    console.log("failed to insert a new content: ", body);
    return { success: false };
  }
}

export default function Course({
  loaderData: { userName, course, contents },
}: Route.ComponentProps): React.JSX.Element {
  return (
    <>
      <title>{`講座 ${course.name} - e-Quiz`}</title>
      <div className="h-screen overflow-auto">
        <Surface className="sticky top-0 z-10 drop-shadow-md">
          <NavBar title={`講座 ${course.name}`} user={{ type: "teacher", name: userName }} />
        </Surface>
        <div className="h-full p-4">
          <div className="flex justify-between">
            <Typography type="h2">コンテンツ一覧</Typography>
            <AddContentButton courseId={course.id} />
          </div>
          <div className="flex flex-col gap-2">
            {contents.length === 0 ? (
              <EmptyState>「コンテンツを新規追加」ボタンからコンテンツを追加しましょう</EmptyState>
            ) : (
              contents.map(({ id, title }) => (
                <Card key={id}>
                  <Card.Content>
                    <Typography type="h3">{title}</Typography>
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

function AddContentButton({ courseId }: { courseId: string }) {
  const fetcher = useFetcher({ key: "contents" });

  return (
    <Modal>
      <Button>コンテンツを新規追加</Button>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>新規コンテンツの情報を入力</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <fetcher.Form method="POST" className="flex flex-col gap-4">
                <input type="hidden" name="container" value={courseId} />
                <div className="flex flex-col gap-1">
                  <Label htmlFor="course_name">名前</Label>
                  <Input
                    id="content_name"
                    name="name"
                    className="min-w-8"
                    placeholder="某コンテンツ"
                    required
                  />
                </div>
                <Button className="self-end" type="submit">
                  追加する
                </Button>
              </fetcher.Form>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
