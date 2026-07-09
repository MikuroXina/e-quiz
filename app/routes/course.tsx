import { AuthContext } from "~/lib/session";
import type { Route } from "./+types/course";
import { Link, redirect, useFetcher, useSubmit } from "react-router";
import { drizzle } from "drizzle-orm/d1";
import { CloudflareContext } from "~/lib/cloudflare";
import * as schema from "~/db/schema";
import { and, eq } from "drizzle-orm";
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
  Select,
  ListBox,
} from "@heroui/react";
import { NavBar } from "~/organisms/nav-bar";
import * as v from "valibot";
import Pencil from "@gravity-ui/icons/Pencil";
import type { PublishState } from "~/lib/content";

interface Content {
  id: string;
  title: string;
  publishState: PublishState;
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
    return redirect(`/log_in?back=/courses/${course_id}`);
  }

  const { env } = context.get(CloudflareContext);
  const db = drizzle(env.e_quiz_db, { schema });
  const teacher = await db.query.teacher.findFirst({
    columns: { name: true },
    where: (teacher, { eq }) => eq(teacher.id, auth.id),
  });
  if (teacher == null) {
    return redirect(`/log_in?back=/courses/${course_id}`);
  }
  const course = await db.query.course.findFirst({
    where: (course, { eq, and }) => and(eq(course.id, course_id), eq(course.ownerId, auth.id)),
  });
  if (course == null) {
    return new Response(null, {
      status: 404,
    });
  }

  const contents = await db.query.content.findMany({
    columns: {
      id: true,
      title: true,
    },
    with: {
      publishState: true,
    },
    where: (content, { eq }) => eq(content.containerId, course.id),
  });

  return {
    userName: teacher.name,
    course,
    contents: contents.map((content) => ({
      ...content,
      publishState:
        content.publishState?.state === "PUBLISHED"
          ? { type: "PUBLISHED", publishedAt: new Date(content.publishState.updatedAt) }
          : { type: "UNPUBLISHED" },
    })),
  };
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
  if (auth.type === "unauthorized") {
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
              content_id: body.content_id,
              state: body.state,
              updatedAt: new Date().toISOString(),
            })
            .onConflictDoUpdate({
              target: schema.publishState.content_id,
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
  loaderData: { userName, course, contents },
}: Route.ComponentProps): React.JSX.Element {
  const submit = useSubmit();
  const onChangePublishState = (contentId: string) => (value: PropertyKey | null) => {
    if (typeof value === "string" && ["PUBLISHED", "UNPUBLISHED"].includes(value)) {
      const formData = new FormData();
      formData.append("type", "SET_PUBLISH_STATE");
      formData.append("content_id", contentId);
      formData.append("state", value);
      submit(formData);
    }
  };

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
              contents.map(({ id, title, publishState }) => (
                <Card key={id}>
                  <Card.Content>
                    <div className="flex justify-between">
                      <Link to={`/courses/${course.id}/contents/${id}`}>
                        <Typography type="h3">{title}</Typography>
                      </Link>
                      <div className="flex items-center gap-2">
                        <Select
                          className="w-32"
                          defaultValue={publishState.type}
                          onChange={onChangePublishState(id)}
                        >
                          <Select.Trigger>
                            <Select.Value />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox>
                              <ListBox.Item id="UNPUBLISHED" textValue="UNPUBLISHED">
                                非公開
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                              <ListBox.Item id="PUBLISHED" textValue="PUBLISHED">
                                公開済み
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                            </ListBox>
                          </Select.Popover>
                        </Select>
                        <EditContentTitleButton contentId={id} oldTitle={title} />
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
                <input type="hidden" name="type" value="SET_TITLE" />
                <input type="hidden" name="container" value={courseId} />
                <div className="flex flex-col gap-1">
                  <Label htmlFor="content_title">名前</Label>
                  <Input
                    id="content_title"
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

function EditContentTitleButton({ contentId, oldTitle }: { contentId: string; oldTitle: string }) {
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
          コンテンツ情報を編集
        </Tooltip.Content>
      </Tooltip>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>コンテンツ「{oldTitle}」の新しい名前を入力</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <fetcher.Form method="PUT" className="flex flex-col gap-4">
                <input type="hidden" name="content_id" value={contentId} />
                <div className="flex flex-col gap-1">
                  <Label htmlFor="new_content_title">名前</Label>
                  <Input
                    id="new_content_title"
                    name="content_title"
                    className="min-w-8"
                    placeholder="某コンテンツ"
                    required
                    defaultValue={oldTitle}
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
