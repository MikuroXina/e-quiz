import {
  AlertDialog,
  Button,
  Card,
  Input,
  Label,
  Modal,
  Radio,
  RadioGroup,
  TextArea,
} from "@heroui/react";
import { Form, useFetcher } from "react-router";
import { Fragment, useEffect, useState } from "react";
import TrashBin from "@gravity-ui/icons/TrashBin";
import ArrowUp from "@gravity-ui/icons/ArrowUp";
import ArrowDown from "@gravity-ui/icons/ArrowDown";
import Plus from "@gravity-ui/icons/Plus";
import type { Content, Quiz } from "~/lib/content";

export interface ContentEditorProps {
  content: Content;
  onSave: (newContent: Content) => Promise<{ success: true }>;
}

export function ContentEditor({ content: defaultContent, onSave }: ContentEditorProps) {
  const [isSaved, setIsSaved] = useState(true);
  const [content, setContent] = useState(defaultContent);

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

  function save() {
    setIsSaved(true);
    // reactivate save button when failed to save
    onSave(content).then(() => setIsSaved(false));
  }

  return (
    <>
      <div className="mb-2">
        <Button onClick={save} isDisabled={isSaved}>
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
            defaultValue={content.body}
            rows={16}
            fullWidth
          />
        </Label>
      </div>
      <div className="flex flex-col gap-2">
        <p>クイズリスト</p>
        <QuizzesList quizzes={content.quizzes} />
        <AddQuizButton contentId={content.id} />
      </div>
    </>
  );
}

function QuizzesList({ quizzes }: { quizzes: readonly Quiz[] }) {
  const fetcher = useFetcher({ key: "quizzes" });

  const onUpdateQuizDescription =
    (quizId: string, solution: number, choices: readonly string[]) =>
    (event: React.FocusEvent<HTMLTextAreaElement>) => {
      const formData = new FormData();
      formData.append("type", "setQuiz");
      formData.append("quiz_id", quizId);
      formData.append("description", event.target.value);
      formData.append("solution", solution.toString());
      formData.append("choices", JSON.stringify(choices));
      void fetch("./", {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }).catch(console.error);
    };

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
                  onBlur={onUpdateQuizDescription(id, solution, choices)}
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
            <AlertDialog>
              <Button variant="danger-soft">
                <TrashBin /> このクイズを削除する
              </Button>
              <AlertDialog.Backdrop>
                <AlertDialog.Container>
                  <AlertDialog.Dialog>
                    <AlertDialog.CloseTrigger />
                    <AlertDialog>このクイズ全体を削除しますか？</AlertDialog>
                    <AlertDialog.Body>入力した選択肢は失われます。</AlertDialog.Body>
                    <AlertDialog.Footer>
                      <Button slot="close" variant="tertiary">
                        キャンセル
                      </Button>
                      <Form method="POST">
                        <input type="hidden" name="type" value="removeQuiz" />
                        <input type="hidden" name="quiz_id" value={id} />
                        <Button type="submit" slot="close" variant="danger">
                          クイズを削除する
                        </Button>
                      </Form>
                    </AlertDialog.Footer>
                  </AlertDialog.Dialog>
                </AlertDialog.Container>
              </AlertDialog.Backdrop>
            </AlertDialog>
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
                  <Label htmlFor="description">説明文</Label>
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
