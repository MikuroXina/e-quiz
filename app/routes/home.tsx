import { Card, Surface, Typography } from "@heroui/react";
import { NavBar } from "~/organisms/nav-bar";

interface Course {
  id: string;
  name: string;
}

export default function Home() {
  const courses: Course[] = [{ id: "foo1", name: "整数論I" }];
  return (
    <>
      <title>ホーム - e-Quiz</title>
      <div className="h-screen overflow-auto">
        <Surface className="sticky top-0 z-10 drop-shadow-md">
          <NavBar title="ホーム" />
        </Surface>
        <div className="h-full p-4">
          <Typography type="h2">講座一覧</Typography>
          <div className="flex flex-col gap-2">
            {courses.map(({ id, name }) => (
              <Card key={id}>
                <Card.Content>
                  <Typography type="h3">{name}</Typography>
                </Card.Content>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
