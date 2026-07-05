import { Button, Typography } from "@heroui/react";
import { Link } from "react-router";

export type User = { type: "teacher"; name: string } | { type: "unauthorized" };

export interface NavBarProps {
  title: string;
  user: User;
}

export function NavBar({ title, user }: NavBarProps): React.JSX.Element {
  return (
    <nav className="flex items-center justify-between">
      <div className="p-2">
        <Typography type="h1">{title}</Typography>
      </div>
      <div className="p-2">
        {user.type === "teacher" ? (
          <div>
            ようこそ {user.name} さん
            <Link to="/log_out">
              <Button variant="danger-soft">ログアウト</Button>
            </Link>
          </div>
        ) : (
          <Link to="/">
            <Button>ログイン</Button>
          </Link>
        )}
      </div>
    </nav>
  );
}
