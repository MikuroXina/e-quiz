import { Button, Card, EmptyState, Input, Label, Modal, Surface, Typography } from "@heroui/react";
import { useFetcher } from "react-router";
import { NavBar } from "~/organisms/nav-bar";
import type { Route } from "./+types/home";
import { AuthContext } from "~/lib/session";
import { CloudflareContext } from "~/lib/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import { course, teacher } from "~/db/schema";
import { eq } from "drizzle-orm";
import * as v from "valibot";

interface Course {
  id: string;
  name: string;
}

type LoaderData =
  | {
      type: "unauthorized";
    }
  | { type: "teacher"; name: string; courses: readonly Course[] };

export async function loader({ context }: Route.LoaderArgs): Promise<LoaderData> {
  const { env } = context.get(CloudflareContext);
  const auth = context.get(AuthContext);
  if (auth.type === "unauthorized") {
    return { type: "unauthorized" };
  }
  const db = drizzle(env.e_quiz_db);
  const res = await db
    .select({ name: teacher.name })
    .from(teacher)
    .where(eq(teacher.id, auth.id))
    .limit(1);
  if (res.length === 0) {
    return { type: "unauthorized" };
  }

  const courses = await db
    .select({
      id: course.id,
      name: course.name,
    })
    .from(course)
    .where(eq(course.owner, auth.id));

  return { type: "teacher", name: res[0].name, courses };
}

const postCoursesSchema = v.object({
  name: v.pipe(v.string(), v.nonEmpty()),
});

export async function action({ request, context }: Route.ActionArgs) {
  const form = Object.fromEntries(await request.formData());
  const parseRes = v.safeParse(postCoursesSchema, form);
  if (!parseRes.success) {
    console.log("bad parameter: ", form);
    return { success: false };
  }
  const body = parseRes.output;

  const auth = context.get(AuthContext);
  if (auth.type !== "teacher") {
    console.log("forbidden user: ", auth);
    return { success: false };
  }

  const { env } = context.get(CloudflareContext);
  const db = drizzle(env.e_quiz_db);
  const newId = crypto.randomUUID();
  try {
    const res = await db
      .insert(course)
      .values({
        id: newId,
        name: body.name,
        owner: auth.id,
      })
      .execute();
    console.log(res);
    return { success: true };
  } catch (err: unknown) {
    console.log("failed to add a new course: ", err);
    return { success: false };
  }
}

export default function Home({ loaderData }: Route.ComponentProps): React.JSX.Element {
  return (
    <>
      <title>ホーム - e-Quiz</title>
      <div className="h-screen overflow-auto">
        <Surface className="sticky top-0 z-10 drop-shadow-md">
          <NavBar title="ホーム" user={loaderData} />
        </Surface>
        <div className="h-full p-4">
          <div className="flex justify-between">
            <Typography type="h2">講座一覧</Typography>
            <AddCourseButton />
          </div>
          <div className="flex flex-col gap-2">
            {loaderData.type === "unauthorized" ? (
              <EmptyState>右上の「ログイン」ボタンからログインしましょう</EmptyState>
            ) : loaderData.courses.length === 0 ? (
              <EmptyState>「講座を新規追加」ボタンから講座を追加しましょう</EmptyState>
            ) : (
              loaderData.courses.map(({ id, name }) => (
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

function AddCourseButton() {
  const fetcher = useFetcher({ key: "courses" });

  return (
    <Modal>
      <Button>講座を新規追加</Button>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>新規講座の情報を入力</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <fetcher.Form method="POST" className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="course_name">名前</Label>
                  <Input
                    id="course_name"
                    name="name"
                    className="min-w-8"
                    placeholder="某講座"
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
