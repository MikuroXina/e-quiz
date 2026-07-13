import Pencil from "@gravity-ui/icons/Pencil";
import { Button, Input, Label, Modal, Tooltip } from "@heroui/react";
import { useFetcher } from "react-router";

export interface EditContentTitleButtonProps {
  contentId: string;
  oldTitle: string;
}

export function EditContentTitleButton({
  contentId,
  oldTitle,
}: EditContentTitleButtonProps): React.JSX.Element {
  const fetcher = useFetcher({ key: "courses" });

  return (
    <Modal>
      <Tooltip delay={0}>
        <Tooltip.Trigger>
          <Button variant="secondary">
            <Pencil />
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <Tooltip.Arrow />
          コンテンツ情報を編集
        </Tooltip.Content>
      </Tooltip>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>コンテンツ「{oldTitle}」の新しい名前を入力</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <fetcher.Form method="PUT" className="flex flex-col gap-4">
                <input type="hidden" name="content_id" value={contentId} />
                <div className="flex flex-col gap-1">
                  <Label htmlFor="new_content_title">名前</Label>
                  <Input
                    id="new_content_title"
                    name="content_title"
                    className="min-w-8"
                    placeholder="某コンテンツ"
                    required
                    defaultValue={oldTitle}
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
