import { Typography } from "@heroui/react";
import { QuizPane } from "./quiz-pane";

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
            <QuizPane key={quiz.id} quiz={quiz} index={i} onSubmit={onSubmit} />
          ))}
        </div>
      </div>
    </div>
  );
}
