import { Button, Description, FieldError, Label, Radio, RadioGroup, Surface } from "@heroui/react";
import { startTransition, useState } from "react";
import { Form } from "react-router";
import { RightOrWrong } from "./right-or-wrong";

export interface QuizPaneProps {
  quiz: {
    id: string;
    description: string;
    choices: readonly string[];
    answerStatus: boolean | null;
  };
  onSubmit: (quizId: string, answer: number) => Promise<void>;
  index: number;
}

export function QuizPane({ quiz, index, onSubmit }: QuizPaneProps): React.JSX.Element {
  const [loading, setLoading] = useState(false);

  return (
    <Surface className="rounded-3xl p-3" variant="secondary">
      <Form
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(() => setLoading(true));
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
          <Label>問題 {index + 1}</Label>
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
          <Button isDisabled={loading || quiz.answerStatus === true} type="submit">
            回答
          </Button>
          <RightOrWrong status={quiz.answerStatus} />
        </div>
      </Form>
    </Surface>
  );
}
