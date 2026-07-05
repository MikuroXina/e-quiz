import { Button, Card, EmptyState, Input, Label, Modal, Surface, Typography } from "@heroui/react";
import { Form } from "react-router";
import { NavBar, type User } from "~/organisms/nav-bar";
import type { Route } from "./+types/home";
import { AuthContext } from "~/lib/session";
import { CloudflareContext } from "~/lib/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import { teacher } from "~/db/schema";
import { eq } from "drizzle-orm";

interface Course {
  id: string;
  name: string;
}

export async function loader({ context }: Route.LoaderArgs): Promise<User> {
  const { env } = context.get(CloudflareContext);
  const auth = context.get(AuthContext);
  if (auth.type === "unauthorized") {
    return { type: "unauthorized" };
  }
  const res = await drizzle(env.e_quiz_db)
    .select({ name: teacher.name })
    .from(teacher)
    .where(eq(teacher.id, auth.id))
    .limit(1);
  if (res.length === 0) {
    return { type: "unauthorized" };
  }
  return { type: "teacher", name: res[0].name };
}

export default function Home({ loaderData }: Route.ComponentProps): React.JSX.Element {
  const courses: Course[] = [];
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
            {courses.length === 0 ? (
              <EmptyState>「講座を新規追加」ボタンから講座を追加しましょう</EmptyState>
            ) : (
              courses.map(({ id, name }) => (
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
              <Form
                action="/api/courses"
                method="POST"
                encType="multipart/form-data"
                navigate={false}
                className="flex flex-col gap-4"
              >
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
              </Form>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
