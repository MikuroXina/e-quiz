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
import type { Content } from "~/lib/content";

export interface ContentViewProps {
  previewHtml: string;
  content: Content;
  onSubmit: (quizId: string, answer: number) => void;
}

export function ContentView({
  previewHtml,
  content,
  onSubmit,
}: ContentViewProps): React.JSX.Element {
  return (
    <div>
      <div dangerouslySetInnerHTML={{ __html: previewHtml }}></div>
      <div className="flex flex-col gap-2 pt-4 pb-4">
        <Typography type="h2">クイズ</Typography>
        <div>
          {content.quizzes.map((quiz, i) => (
            <Surface className="rounded-3xl p-3" variant="secondary" key={quiz.id}>
              <Form
                onSubmit={(event) => {
                  event.preventDefault();
                  const { elements } = event.target;
                  const answerNode = elements.namedItem("answer");
                  if (answerNode == null) {
                    return;
                  }

                  const answer = parseInt((answerNode as RadioNodeList).value, 10);
                  onSubmit(quiz.id, answer);
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
                <Button className="mt-4" type="submit">
                  回答
                </Button>
              </Form>
            </Surface>
          ))}
        </div>
      </div>
    </div>
  );
}
