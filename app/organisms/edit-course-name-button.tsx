import { Button, Input, Label, Modal, Tooltip } from "@heroui/react";
import { useFetcher } from "react-router";
import Pencil from "@gravity-ui/icons/Pencil";

export interface EditCourseNameButtonProps {
  courseId: string;
  oldName: string;
}

export function EditCourseNameButton({
  courseId,
  oldName,
}: EditCourseNameButtonProps): React.JSX.Element {
  const fetcher = useFetcher({ key: "courses" });

  return (
    <Modal>
      <Tooltip delay={0}>
        <Tooltip.Trigger>
          <Button isIconOnly variant="secondary">
            <Pencil />
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <Tooltip.Arrow />
          講座情報を編集
        </Tooltip.Content>
      </Tooltip>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>講座「{oldName}」の新しい名前を入力</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <fetcher.Form method="PUT" className="flex flex-col gap-4">
                <input type="hidden" name="course_id" value={courseId} />
                <div className="flex flex-col gap-1">
                  <Label htmlFor="new_course_name">名前</Label>
                  <Input
                    id="new_course_name"
                    name="course_name"
                    className="min-w-8"
                    placeholder="某講座"
                    required
                    defaultValue={oldName}
                  />
                </div>
                <Button className="self-end" type="submit">
                  変更する
                </Button>
              </fetcher.Form>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
