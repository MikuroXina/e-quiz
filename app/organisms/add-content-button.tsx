import { Button, Input, Label, Modal } from "@heroui/react";
import { useFetcher } from "react-router";

export interface AddContentButtonProps {
  courseId: string;
}

export function AddContentButton({ courseId }: AddContentButtonProps): React.JSX.Element {
  const fetcher = useFetcher({ key: "contents" });

  return (
    <Modal>
      <Button>コンテンツを新規追加</Button>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>新規コンテンツの情報を入力</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <fetcher.Form method="POST" className="flex flex-col gap-4">
                <input type="hidden" name="type" value="SET_TITLE" />
                <input type="hidden" name="container" value={courseId} />
                <div className="flex flex-col gap-1">
                  <Label htmlFor="content_title">名前</Label>
                  <Input
                    id="content_title"
                    name="name"
                    className="min-w-8"
                    placeholder="某コンテンツ"
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
