import {
  AlertDialog,
  Button,
  Card,
  ErrorMessage,
  Input,
  Label,
  Radio,
  RadioGroup,
  ScrollShadow,
  Spinner,
  Tabs,
  TextArea,
  Tooltip,
} from "@heroui/react";
import { Form } from "react-router";
import { Fragment, useEffect, useReducer, useState, type Dispatch } from "react";
import TrashBin from "@gravity-ui/icons/TrashBin";
import ArrowUp from "@gravity-ui/icons/ArrowUp";
import ArrowDown from "@gravity-ui/icons/ArrowDown";
import Plus from "@gravity-ui/icons/Plus";
import type { Content, PublishState, Quiz } from "~/lib/content";
import { debounce } from "~/lib/debounce";
import FloppyDisk from "@gravity-ui/icons/FloppyDisk";
import type { Brand } from "valibot";
import { produce } from "immer";
import { PublishStateSelector } from "./publish-state-selector";

type SaveState =
  | { type: "pending" }
  | { type: "unsaved" }
  | { type: "saving" }
  | { type: "failure" };

interface State {
  content: Content;
  save: SaveState;
}

type Action =
  | { type: "SAVE_START" }
  | { type: "SAVE_ERROR" }
  | { type: "SAVE_DONE" }
  | { type: "SET_PUBLISH_STATE"; newPublishState: PublishState["type"] }
  | {
      type: "EDIT_BODY";
      newBody: string;
    }
  | { type: "ADD_QUIZ" }
  | {
      type: "REMOVE_QUIZ";
      quizIndex: number;
    }
  | {
      type: "EDIT_QUIZ_DESCRIPTION";
      quizIndex: number;
      newDescription: string;
    }
  | { type: "SWAP_QUIZ_ABOVE"; quizIndex: number }
  | { type: "SWAP_QUIZ_BELOW"; quizIndex: number }
  | {
      type: "ADD_CHOICE";
      quizIndex: number;
    }
  | {
      type: "REMOVE_CHOICE";
      quizIndex: number;
      choiceIndex: number;
    }
  | {
      type: "EDIT_CHOICE_DESCRIPTION";
      quizIndex: number;
      choiceIndex: number;
      newDescription: string;
    }
  | {
      type: "SET_ANSWER";
      quizIndex: number;
      choiceIndex: number;
    };

const reduce: (state: State, action: Action) => State = produce((state, action) => {
  switch (action.type) {
    case "SAVE_START":
      return { ...state, save: { type: "saving" } };
    case "SAVE_ERROR":
      return { ...state, save: { type: "failure" } };
    case "SAVE_DONE":
      return { ...state, save: { type: "pending" } };
    default:
      state.save.type = "unsaved";
  }
  switch (action.type) {
    case "SET_PUBLISH_STATE":
      state.content.publishState.type = action.newPublishState;
      if (state.content.publishState.type === "PUBLISHED") {
        state.content.publishState.publishedAt = new Date().toISOString();
      }
      break;
    case "EDIT_BODY":
      state.content.body = action.newBody;
      break;
    case "ADD_QUIZ": {
      const newId = crypto.randomUUID();
      state.content.quizzes.push({
        id: newId as string & Brand<"Quiz">,
        description: "",
        choices: [""],
        solution: 0,
      });
      break;
    }
    case "REMOVE_QUIZ":
      state.content.quizzes.pop();
      break;
    case "EDIT_QUIZ_DESCRIPTION":
      state.content.quizzes[action.quizIndex].description = action.newDescription;
      break;
    case "SWAP_QUIZ_ABOVE":
      [state.content.quizzes[action.quizIndex], state.content.quizzes[action.quizIndex - 1]] = [
        state.content.quizzes[action.quizIndex - 1],
        state.content.quizzes[action.quizIndex],
      ];
      break;
    case "SWAP_QUIZ_BELOW":
      [state.content.quizzes[action.quizIndex], state.content.quizzes[action.quizIndex + 1]] = [
        state.content.quizzes[action.quizIndex + 1],
        state.content.quizzes[action.quizIndex],
      ];
      break;
    case "ADD_CHOICE":
      state.content.quizzes[action.quizIndex].choices.push("");
      break;
    case "REMOVE_CHOICE":
      state.content.quizzes[action.quizIndex].choices.pop();
      break;
    case "EDIT_CHOICE_DESCRIPTION":
      state.content.quizzes[action.quizIndex].choices[action.choiceIndex] = action.newDescription;
      break;
    case "SET_ANSWER":
      state.content.quizzes[action.quizIndex].solution = action.choiceIndex;
      break;
  }
});

export interface ContentEditorProps {
  content: Content;
  previewHtml: string;
  saveError: boolean;
  onSave: (newContent: Content) => Promise<{ success: true }>;
}

export function ContentEditor({
  content: defaultContent,
  previewHtml,
  saveError,
  onSave,
}: ContentEditorProps) {
  const [state, dispatch] = useReducer(reduce, {
    content: defaultContent,
    save: { type: "pending" },
  });

  useEffect(() => {
    const confirmUnsaved = (e: BeforeUnloadEvent) => {
      if (state.save.type !== "pending") {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", confirmUnsaved);
    return () => {
      window.removeEventListener("beforeunload", confirmUnsaved);
    };
  }, [state.save]);

  function save() {
    dispatch({ type: "SAVE_START" });
    onSave(state.content).then(
      () => dispatch({ type: "SAVE_DONE" }),
      () => dispatch({ type: "SAVE_ERROR" }),
    );
  }

  return (
    <>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button onClick={save} isDisabled={!saveError && state.save.type === "pending"}>
            {state.save.type === "saving" ? <Spinner color="current" size="sm" /> : <FloppyDisk />}
            保存
          </Button>
          {saveError && <ErrorMessage>保存に失敗しました</ErrorMessage>}
        </div>
        <div>
          <Label className="flex flex-row items-center gap-2">
            公開設定
            <PublishStateSelector
              publishState={state.content.publishState}
              onChange={(newPublishState) =>
                dispatch({ type: "SET_PUBLISH_STATE", newPublishState })
              }
            />
          </Label>
        </div>
      </div>
      <div>
        <Tabs>
          <Tabs.ListContainer>
            <Tabs.List>
              <Tabs.Tab id="edit">
                編集
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="preview">
                プレビュー
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
          <Tabs.Panel id="edit">
            <Label>
              本文
              <TextArea
                className="outline outline-gray-200 outline-solid"
                name="content_body"
                placeholder={"# 見出し 1\n…"}
                onChange={debounce((event) =>
                  dispatch({ type: "EDIT_BODY", newBody: event.target.value }),
                )}
                defaultValue={state.content.body}
                rows={16}
                fullWidth
              />
            </Label>
          </Tabs.Panel>
          <Tabs.Panel id="preview">
            <ScrollShadow className="max-h-60 overflow-y-scroll">
              <div dangerouslySetInnerHTML={{ __html: previewHtml }}></div>
            </ScrollShadow>
          </Tabs.Panel>
        </Tabs>
      </div>
      <div className="flex flex-col gap-2 pt-4 pb-4">
        <p>クイズリスト</p>
        <QuizzesList quizzes={state.content.quizzes} dispatch={dispatch} />
        <Button onClick={() => dispatch({ type: "ADD_QUIZ" })}>クイズを追加</Button>
      </div>
    </>
  );
}

interface QuizzesListProps {
  quizzes: readonly Quiz[];
  dispatch: Dispatch<Action>;
}
function QuizzesList({ quizzes, dispatch }: QuizzesListProps) {
  return (
    <div className="flex flex-col gap-2">
      {quizzes.map(({ id, description, choices, solution }, quizIndex) => (
        <Card key={id}>
          <Card.Header>
            <Card.Description>
              <Label>
                クイズ {quizIndex + 1} の問題文
                <TextArea
                  className="outline outline-gray-200 outline-solid"
                  fullWidth
                  placeholder={`問題 ${quizIndex + 1}: …`}
                  defaultValue={description}
                  cols={2}
                  onChange={debounce((event) => {
                    dispatch({
                      type: "EDIT_QUIZ_DESCRIPTION",
                      quizIndex,
                      newDescription: event.target.value,
                    });
                  })}
                />
              </Label>
            </Card.Description>
          </Card.Header>
          <Card.Content>
            <RadioGroup defaultValue={`${solution}`}>
              <Label>選択肢リスト</Label>
              <div className="grid w-full grid-cols-[8rem_1fr_3rem] items-center gap-2">
                {choices.map((choice, choiceIndex) => (
                  <Fragment key={choiceIndex}>
                    <Radio
                      className="mt-0"
                      value={`${choiceIndex}`}
                      onClick={() => dispatch({ type: "SET_ANSWER", quizIndex, choiceIndex })}
                    >
                      <Radio.Content>
                        これが正解{" "}
                        <Radio.Control>
                          <Radio.Indicator />
                        </Radio.Control>
                      </Radio.Content>
                    </Radio>
                    <Input
                      type="text"
                      placeholder="クイズの選択肢…"
                      defaultValue={choice}
                      onChange={debounce((event) =>
                        dispatch({
                          type: "EDIT_CHOICE_DESCRIPTION",
                          quizIndex,
                          choiceIndex,
                          newDescription: event.target.value,
                        }),
                      )}
                    />
                    <Tooltip delay={0}>
                      <Tooltip.Trigger>
                        <Button
                          variant="danger-soft"
                          isDisabled={choices.length <= 1}
                          onClick={() =>
                            dispatch({ type: "REMOVE_CHOICE", quizIndex, choiceIndex })
                          }
                        >
                          <TrashBin />
                        </Button>
                      </Tooltip.Trigger>
                      <Tooltip.Content>
                        <Tooltip.Arrow />
                        この選択肢を削除する
                      </Tooltip.Content>
                    </Tooltip>
                  </Fragment>
                ))}
              </div>
            </RadioGroup>
          </Card.Content>
          <Card.Footer>
            <Button variant="secondary" onClick={() => dispatch({ type: "ADD_CHOICE", quizIndex })}>
              <Plus /> 選択肢を追加する
            </Button>
            <Button
              variant="ghost"
              isDisabled={quizIndex <= 0}
              onClick={() => dispatch({ type: "SWAP_QUIZ_ABOVE", quizIndex })}
            >
              <ArrowUp /> 上と入れ替える
            </Button>
            <Button
              variant="ghost"
              isDisabled={quizIndex >= quizzes.length - 1}
              onClick={() => dispatch({ type: "SWAP_QUIZ_BELOW", quizIndex })}
            >
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
                        <Button
                          slot="close"
                          variant="danger"
                          onClick={() => dispatch({ type: "REMOVE_QUIZ", quizIndex })}
                        >
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
