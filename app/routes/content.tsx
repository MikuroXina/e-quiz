import { CloudflareContext } from "~/lib/cloudflare";
import type { Route } from "./+types/content";
import {
  Button,
  Card,
  Input,
  Label,
  Modal,
  Radio,
  RadioGroup,
  Surface,
  TextArea,
} from "@heroui/react";
import { drizzle } from "drizzle-orm/d1";
import { AuthContext } from "~/lib/session";
import { redirect, useFetcher } from "react-router";
import * as schema from "~/db/schema";
import { eq, inArray, SQL, sql } from "drizzle-orm";
import { NavBar } from "~/organisms/nav-bar";
import * as v from "valibot";
import { Fragment, useEffect, useState } from "react";
import TrashBin from "@gravity-ui/icons/TrashBin";
import ArrowUp from "@gravity-ui/icons/ArrowUp";
import ArrowDown from "@gravity-ui/icons/ArrowDown";
import Plus from "@gravity-ui/icons/Plus";

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

const putBodySchema = v.variant("type", [
  v.object({
    type: v.literal("setBody"),
    content_id: v.pipe(v.string(), v.nonEmpty()),
    content_body: v.string(),
  }),
  v.object({
    type: v.literal("addQuiz"),
    content_id: v.pipe(v.string(), v.nonEmpty()),
    description: v.string(),
    solution: v.pipe(v.string(), v.decimal(), v.toNumber(), v.integer()),
    choices: v.pipe(v.string(), v.parseJson(), choicesSchema),
  }),
  v.object({
    type: v.literal("setQuiz"),
    quiz_id: v.pipe(v.string(), v.nonEmpty()),
    description: v.string(),
    solution: v.pipe(v.string(), v.decimal(), v.toNumber(), v.integer()),
    choices: v.pipe(v.string(), v.parseJson(), choicesSchema),
  }),
  v.object({
    type: v.literal("reorderQuiz"),
    new_order: v.array(
      v.object({
        quiz_id: v.pipe(v.string(), v.nonEmpty()),
        order: v.pipe(v.string(), v.decimal(), v.toNumber(), v.integer()),
      }),
    ),
  }),
  v.object({
    type: v.literal("removeQuiz"),
    quiz_id: v.pipe(v.string(), v.nonEmpty()),
  }),
]);

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
    console.log("bad parameter: ", bodyRes.issues[0]);
    return new Response(null, { status: 400 });
  }
  const body = bodyRes.output;

  const { env } = context.get(CloudflareContext);
  const db = drizzle(env.e_quiz_db);
  switch (body.type) {
    case "setBody": {
      const target = await db
        .select({ id: schema.content.id })
        .from(schema.content)
        .innerJoin(schema.course, eq(schema.content.containerId, schema.course.id))
        .innerJoin(schema.teacher, eq(schema.course.ownerId, auth.id))
        .where(eq(schema.content.id, body.content_id))
        .limit(1);
      if (target.length === 0) {
        console.log("target is not created by the authorized user: ", auth);
        return new Response(null, { status: 400 });
      }
      try {
        await db
          .update(schema.content)
          .set({
            content: body.content_body,
          })
          .where(eq(schema.content.id, body.content_id))
          .execute();
        return { success: true };
      } catch (err: unknown) {
        console.log("failed to update body of the content: ", err);
        return new Response(null, { status: 500 });
      }
    }
    case "addQuiz": {
      try {
        const newId = crypto.randomUUID();
        const orderMaxRes = await db
          .select({ orderMax: sql<number>`max(${schema.quiz.order}) + 1` })
          .from(schema.quiz)
          .where(eq(schema.quiz.containerId, body.content_id));
        await db
          .insert(schema.quiz)
          .values([
            {
              id: newId,
              containerId: body.content_id,
              order: orderMaxRes?.[0]?.orderMax ?? 0,
              description: body.description,
              solution: body.solution,
              choices: JSON.stringify(body.choices),
            },
          ])
          .execute();
        return { success: true };
      } catch (err: unknown) {
        console.log("failed to add a new quiz: ", err);
        return new Response(null, { status: 500 });
      }
    }
    case "setQuiz": {
      const target = await db
        .select({ id: schema.quiz.id })
        .from(schema.quiz)
        .innerJoin(schema.content, eq(schema.quiz.containerId, schema.content.id))
        .innerJoin(schema.course, eq(schema.content.containerId, schema.course.id))
        .innerJoin(schema.teacher, eq(schema.course.ownerId, auth.id))
        .innerJoin(schema.teacher, eq(schema.course.ownerId, auth.id))
        .where(eq(schema.quiz.id, body.quiz_id))
        .limit(1);
      if (target.length === 0) {
        console.log("target is not created by the authorized user: ", auth);
        return new Response(null, { status: 400 });
      }
      try {
        await db
          .update(schema.quiz)
          .set({
            description: body.description,
            solution: body.solution,
            choices: JSON.stringify(body.choices),
          })
          .where(eq(schema.quiz, body.quiz_id))
          .execute();
        return { success: true };
      } catch (err: unknown) {
        console.log("failed to update the quiz: ", err);
        return new Response(null, { status: 500 });
      }
    }
    case "reorderQuiz": {
      const ids: readonly string[] = body.new_order.map(({ quiz_id }) => quiz_id);
      const targets = await db
        .select({ id: schema.quiz.id })
        .from(schema.quiz)
        .innerJoin(schema.content, eq(schema.quiz.containerId, schema.content.id))
        .innerJoin(schema.course, eq(schema.content.containerId, schema.course.id))
        .innerJoin(schema.teacher, eq(schema.course.ownerId, schema.teacher.id))
        .where(inArray(schema.quiz.id, ids));
      if (targets.length !== body.new_order.length) {
        console.log("target is not created by the authorized user: ", auth);
        return new Response(null, { status: 400 });
      }
      try {
        const sqlChunks: SQL[] = [sql`(case`];
        for (const { quiz_id, order } of body.new_order) {
          sqlChunks.push(sql`when ${schema.quiz.id} = ${quiz_id} then ${order}`);
        }
        sqlChunks.push(sql`end)`);
        const concatenated = sql.join(sqlChunks, sql.raw(" "));
        await db
          .update(schema.quiz)
          .set({ order: concatenated })
          .where(inArray(schema.quiz.id, ids))
          .execute();
        return { success: true };
      } catch (err: unknown) {
        console.log("failed to update the quiz: ", err);
        return new Response(null, { status: 500 });
      }
    }
    case "removeQuiz": {
      const target = await db
        .select({ id: schema.quiz.id })
        .from(schema.quiz)
        .innerJoin(schema.content, eq(schema.quiz.containerId, schema.content.id))
        .innerJoin(schema.course, eq(schema.content.containerId, schema.course.id))
        .innerJoin(schema.teacher, eq(schema.course.ownerId, auth.id))
        .innerJoin(schema.teacher, eq(schema.course.ownerId, auth.id))
        .where(eq(schema.quiz.id, body.quiz_id))
        .limit(1);
      if (target.length === 0) {
        console.log("target is not created by the authorized user: ", auth);
        return new Response(null, { status: 400 });
      }
      try {
        await db.delete(schema.quiz).where(eq(schema.quiz.id, body.quiz_id)).execute();
        return { success: true };
      } catch (err: unknown) {
        console.log("failed to delete the quiz: ", err);
        return new Response(null, { status: 500 });
      }
    }
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

  useEffect(() => {
    const confirmUnsaved = (e: BeforeUnloadEvent) => {
      if (!isSaved) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", confirmUnsaved);
    return () => {
      window.removeEventListener("beforeunload", confirmUnsaved);
    };
  }, [isSaved]);

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
          <fetcher.Form method="POST" onSubmit={() => setIsSaved(true)}>
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
          <div className="flex flex-col gap-2">
            <p>クイズリスト</p>
            <QuizzesList quizzes={loaderData.content.quizzes} />
            <AddQuizButton contentId={loaderData.content.id} />
          </div>
        </div>
      </div>
    </>
  );
}

function QuizzesList({ quizzes }: { quizzes: readonly Quiz[] }) {
  const fetcher = useFetcher({ key: "quizzes" });

  return (
    <div>
      {quizzes.map(({ id, description, choices, solution }) => (
        <Card key={id}>
          <Card.Header>
            <Card.Description>
              <Label>
                クイズの説明文
                <TextArea
                  className="outline outline-gray-200 outline-solid"
                  fullWidth
                  placeholder="問題１:…"
                  defaultValue={description}
                  cols={2}
                />
              </Label>
            </Card.Description>
          </Card.Header>
          <Card.Content>
            <RadioGroup defaultValue={`${solution}`}>
              <Label>選択肢リスト</Label>
              <div className="grid w-full grid-cols-[8rem_1fr_3rem] items-center gap-2">
                {choices.map((choice, i) => (
                  <Fragment key={choice}>
                    <Radio className="mt-0" value={`${i}`}>
                      <Radio.Content>
                        これが正解{" "}
                        <Radio.Control>
                          <Radio.Indicator />
                        </Radio.Control>
                      </Radio.Content>
                    </Radio>
                    <Input type="text" placeholder="クイズの選択肢…" defaultValue={choice} />
                    <Button aria-label="この選択肢を削除する" variant="danger-soft">
                      <TrashBin />
                    </Button>
                  </Fragment>
                ))}
              </div>
            </RadioGroup>
          </Card.Content>
          <Card.Footer>
            <Button variant="secondary">
              <Plus /> 選択肢を追加する
            </Button>
            <Button variant="ghost">
              <ArrowUp /> 上と入れ替える
            </Button>
            <Button variant="ghost">
              <ArrowDown /> 下と入れ替える
            </Button>
            <Button variant="danger-soft">
              <TrashBin /> このクイズを削除する
            </Button>
          </Card.Footer>
        </Card>
      ))}
    </div>
  );
}

function AddQuizButton({ contentId }: { contentId: string }) {
  const fetcher = useFetcher({ key: "quizzes" });

  return (
    <Modal>
      <Button>クイズを追加</Button>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>新規クイズの情報を入力</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <fetcher.Form method="POST" className="flex flex-col gap-4">
                <input type="hidden" name="type" value="addQuiz" />
                <input type="hidden" name="content_id" value={contentId} />
                <input type="hidden" name="solution" value="0" />
                <input type="hidden" name="choices" value={'[""]'} />
                <div className="flex flex-col gap-1">
                  <Label htmlFor="description">名前</Label>
                  <Input
                    id="description"
                    name="description"
                    className="min-w-8"
                    placeholder="問題１：…"
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
