import Circle from "@gravity-ui/icons/Circle";
import Xmark from "@gravity-ui/icons/Xmark";

export interface RightOrWrongProps {
  solution: number;
  answer: number | null;
}

export function RightOrWrong({ solution, answer }: RightOrWrongProps): React.JSX.Element {
  if (answer === null) {
    return <></>;
  }
  return solution === answer ? (
    <div className="text-green-600">
      正解! <Circle className="inline-block translate-y-[-8%]" />
    </div>
  ) : (
    <div className="text-red-600">
      不正解! <Xmark className="inline-block translate-y-[-8%]" />
    </div>
  );
}
