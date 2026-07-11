import { Button, toast, Tooltip } from "@heroui/react";
import Link from "@gravity-ui/icons/Link";

export interface CopyInviteLinkProps {
  courseId: string;
}

export function CopyInviteLink({ courseId }: CopyInviteLinkProps): React.JSX.Element {
  function onClickLink() {
    const url = new URL(`/invite?course_id=${courseId}`, location.origin).href;
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success("招待リンクをコピーしました"), console.error);
  }

  return (
    <Tooltip>
      <Tooltip.Trigger>
        <Button variant="tertiary" isIconOnly aria-label="招待リンクをコピー" onClick={onClickLink}>
          <Link />
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Content>
        <Tooltip.Arrow />
        招待リンクをコピー
      </Tooltip.Content>
    </Tooltip>
  );
}
