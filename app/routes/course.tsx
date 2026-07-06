import { AuthContext } from "~/lib/session";
import type { Route } from "./+types/course";
import { redirect, useFetcher } from "react-router";
import { drizzle } from "drizzle-orm/d1";
import { CloudflareContext } from "~/lib/cloudflare";
import { course, teacher } from "~/db/schema";
import { and, eq } from "drizzle-orm";
import { Button, Card, EmptyState, Input, Label, Modal, Surface, Typography } from "@heroui/react";
import { NavBar } from "~/organisms/nav-bar";

interface Content {
  id: string;
  name: string;
}

export async function loader({
  params: { course_id },
  context,
}: Route.LoaderArgs): Promise<
  Response | { userName: string; course: { id: string; name: string } }
> {
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

  return { userName: teacherRes[0].name, course: courseRes[0] };
}

export default function Course({
  loaderData: { userName, course },
}: Route.ComponentProps): React.JSX.Element {
  const contents: Content[] = [];
  return (
    <>
      <title>講座 {course.name} - e-Quiz</title>
      <div className="h-screen overflow-auto">
        <Surface className="sticky top-0 z-10 drop-shadow-md">
          <NavBar title="ホーム" user={{ type: "teacher", name: userName }} />
        </Surface>
        <div className="h-full p-4">
          <div className="flex justify-between">
            <Typography type="h2">コンテンツ一覧</Typography>
            <AddContentButton />
          </div>
          <div className="flex flex-col gap-2">
            {contents.length === 0 ? (
              <EmptyState>「コンテンツを新規追加」ボタンからコンテンツを追加しましょう</EmptyState>
            ) : (
              contents.map(({ id, name }) => (
                <Card key={id}>
                  <Card.Content>
                    <Typography type="h3">{name}</Typography>
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

function AddContentButton() {
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
                <div className="flex flex-col gap-1">
                  <Label htmlFor="course_name">名前</Label>
                  <Input
                    id="course_name"
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
