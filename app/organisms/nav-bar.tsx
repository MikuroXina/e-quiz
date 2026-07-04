import { Button, Typography } from "@heroui/react";
import { Link } from "react-router";

export interface NavBarProps {
  title: string;
}

export function NavBar({ title }: NavBarProps): React.JSX.Element {
  return (
    <nav className="flex items-center justify-between">
      <div className="p-2">
        <Typography type="h1">{title}</Typography>
      </div>
      <div className="p-2">
        <Link to="/log_out">
          <Button variant="danger-soft">Log Out</Button>
        </Link>
      </div>
    </nav>
  );
}
