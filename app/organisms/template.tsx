import { Surface } from "@heroui/react";
import { NavBar, type User } from "./nav-bar";

export interface TemplateProps {
  title: string;
  user: User;
  hideHistoryBack?: boolean;
  children: React.ReactNode;
}

export function Template({
  title,
  user,
  hideHistoryBack,
  children,
}: TemplateProps): React.JSX.Element {
  return (
    <>
      <title>{`${title} - e-Quiz`}</title>
      <div className="h-screen overflow-auto">
        <Surface className="sticky top-0 z-10 drop-shadow-md">
          <NavBar title={title} user={user} hideHistoryBack={hideHistoryBack} />
        </Surface>
        <div className="flex h-full flex-col gap-4 p-4">{children}</div>
      </div>
    </>
  );
}
