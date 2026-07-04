import { Button, Card, EmptyState, Input, Label, Modal, Surface, Typography } from "@heroui/react";
import { NavBar } from "~/organisms/nav-bar";

interface Course {
  id: string;
  name: string;
}

export default function Home(): React.JSX.Element {
  const courses: Course[] = [];
  return (
    <>
      <title>ホーム - e-Quiz</title>
      <div className="h-screen overflow-auto">
        <Surface className="sticky top-0 z-10 drop-shadow-md">
          <NavBar title="ホーム" />
        </Surface>
        <div className="h-full p-4">
          <div className="flex justify-between">
            <Typography type="h2">講座一覧</Typography>
            <AddCourseButton />
          </div>
          <div className="flex flex-col gap-2">
            {courses.length === 0 ? (
              <EmptyState>「講座を新規追加」ボタンから講座を追加しましょう</EmptyState>
            ) : (
              courses.map(({ id, name }) => (
                <Card key={id}>
                  <Card.Content>
                    <Typography type="h3">{name}</Typography>
                  </Card.Content>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function AddCourseButton() {
  return (
    <Modal>
      <Button>講座を新規追加</Button>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>新規講座の情報を入力</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className="flex flex-col gap-1">
                <Label htmlFor="course_name">名前</Label>
                <Input id="course_name" className="min-w-8" placeholder="某講座" />
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button>追加する</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
