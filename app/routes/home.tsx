import {
  Button,
  Card,
  EmptyState,
  Input,
  Label,
  Modal,
  Surface,
  Tooltip,
  Typography,
} from "@heroui/react";
import { Link, useFetcher } from "react-router";
import { NavBar } from "~/organisms/nav-bar";
import type { Route } from "./+types/home";
import { AuthContext } from "~/lib/session";
import { CloudflareContext } from "~/lib/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import { course, teacher } from "~/db/schema";
import { eq } from "drizzle-orm";
import * as v from "valibot";
import Pencil from "@gravity-ui/icons/Pencil";

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
    const db = drizzle(env.e_quiz_db);
    try {
      await db
        .update(course)
        .set({
          name: body.course_name,
        })
        .where(eq(course.id, body.course_id))
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
      .insert(course)
      .values({
        id: newId,
        name: body.name,
        owner: auth.id,
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
    <>
      <title>ホーム - e-Quiz</title>
      <div className="h-screen overflow-auto">
        <Surface className="sticky top-0 z-10 drop-shadow-md">
          <NavBar title="ホーム" user={loaderData} />
        </Surface>
        <div className="h-full p-4">
          <div className="flex justify-between">
            <Typography type="h2">講座一覧</Typography>
            {loaderData.type === "teacher" && <AddCourseButton />}
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
                    <div className="flex justify-between">
                      <Link to={`/courses/${id}`}>
                        <Typography type="h3">{name}</Typography>
                      </Link>
                      <div className="flex items-center gap-2">
                        <EditCourseNameButton courseId={id} oldName={name} />
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

function EditCourseNameButton({ courseId, oldName }: { courseId: string; oldName: string }) {
  const fetcher = useFetcher({ key: "courses" });

  return (
    <Modal>
      <Tooltip delay={0}>
        <Tooltip.Trigger>
          <Button variant="secondary">
            <Pencil />
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <Tooltip.Arrow />
          講座情報を編集
        </Tooltip.Content>
      </Tooltip>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>講座「{oldName}」の新しい名前を入力</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <fetcher.Form method="PUT" className="flex flex-col gap-4">
                <input type="hidden" name="course_id" value={courseId} />
                <div className="flex flex-col gap-1">
                  <Label htmlFor="new_course_name">名前</Label>
                  <Input
                    id="new_course_name"
                    name="course_name"
                    className="min-w-8"
                    placeholder="某講座"
                    required
                    defaultValue={oldName}
                  />
                </div>
                <Button className="self-end" type="submit">
                  変更する
                </Button>
              </fetcher.Form>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
