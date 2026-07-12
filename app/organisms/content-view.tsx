import {
  Button,
  Description,
  FieldError,
  Label,
  Radio,
  RadioGroup,
  Surface,
  Typography,
} from "@heroui/react";
import { Form } from "react-router";
import { RightOrWrong } from "./right-or-wrong";

export interface ContentViewProps {
  previewHtml: string;
  quizzes: readonly {
    id: string;
    description: string;
    choices: readonly string[];
    answerStatus: boolean | null;
  }[];
  onSubmit: (quizId: string, answer: number) => Promise<void>;
}

export function ContentView({
  previewHtml,
  quizzes,
  onSubmit,
}: ContentViewProps): React.JSX.Element {
  return (
    <div>
      <div dangerouslySetInnerHTML={{ __html: previewHtml }}></div>
      <div className="flex flex-col gap-2 pt-4 pb-4">
        <Typography type="h2">クイズ</Typography>
        <div>
          {quizzes.map((quiz, i) => (
            <Surface className="rounded-3xl p-3" variant="secondary" key={quiz.id}>
              <Form
                onSubmit={(event) => {
                  event.preventDefault();
                  const { elements } = event.target;
                  const answerNode = elements.namedItem("answer") as RadioNodeList | null;
                  if (answerNode == null) {
                    return;
                  }

                  const answer = parseInt(answerNode.value, 10);
                  onSubmit(quiz.id, answer).catch(console.error);
                }}
              >
                <RadioGroup isRequired name="answer">
                  <Label>問題 {i + 1}</Label>
                  <Description>{quiz.description}</Description>
                  {quiz.choices.map((choice, i) => (
                    <Radio key={choice} value={`${i}`}>
                      <Radio.Content>
                        <Radio.Control>
                          <Radio.Indicator />
                        </Radio.Control>
                        {choice}
                      </Radio.Content>
                    </Radio>
                  ))}
                  <FieldError>選択肢を 1 つ選んでください</FieldError>
                </RadioGroup>
                <div className="mt-4 flex items-center gap-4">
                  <Button isDisabled={quiz.answerStatus === true} type="submit">
                    回答
                  </Button>
                  <RightOrWrong status={quiz.answerStatus} />
                </div>
              </Form>
            </Surface>
          ))}
        </div>
      </div>
    </div>
  );
}
