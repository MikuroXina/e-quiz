import { Button, Typography } from "@heroui/react";
import { Link } from "react-router";
import ArrowUturnCcwLeft from "@gravity-ui/icons/ArrowUturnCcwLeft";

export type User = { type: "teacher" | "student"; name: string } | { type: "unauthorized" };

export interface NavBarProps {
  title: string;
  user: User;
  hideHistoryBack?: boolean;
}

function historyBack() {
  history.back();
}

export function NavBar({ title, user, hideHistoryBack }: NavBarProps): React.JSX.Element {
  return (
    <nav className="flex items-center justify-between">
      <div className="flex gap-2 p-2">
        {!hideHistoryBack && (
          <Button onClick={historyBack} variant="ghost">
            <ArrowUturnCcwLeft />
          </Button>
        )}
        <Typography type="h1">{title}</Typography>
      </div>
      <div className="p-2">
        {user.type === "unauthorized" ? (
          <Link to="/log_in">
            <Button>ログイン</Button>
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            <span>ようこそ {user.name} さん</span>
            <Link to="/log_out">
              <Button variant="danger-soft">ログアウト</Button>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
