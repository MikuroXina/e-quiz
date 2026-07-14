import { Button, Input, Label, Modal } from "@heroui/react";
import { useFetcher } from "react-router";

export function AddCourseButton(): React.JSX.Element {
  const fetcher = useFetcher({ key: "courses" });

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
              <fetcher.Form method="POST" className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="course_name">名前</Label>
                  <Input
                    id="course_name"
                    name="name"
                    className="min-w-8"
                    placeholder="某講座"
                    required
                  />
                </div>
                <Button className="self-end" type="submit">
                  追加する
                </Button>
              </fetcher.Form>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
