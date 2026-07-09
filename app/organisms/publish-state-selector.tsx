import { Select, ListBox } from "@heroui/react";
import type { PublishState } from "~/lib/content";

export interface PublishStateSelectorProps {
  publishState: PublishState;
  onChange: (value: PublishState["type"]) => void;
}

const isKindOfState = (key: unknown): key is PublishState["type"] =>
  typeof key === "string" && ["PUBLISHED", "UNPUBLISHED"].includes(key);

export function PublishStateSelector({
  publishState,
  onChange,
}: PublishStateSelectorProps): React.JSX.Element {
  return (
    <Select
      className="w-32"
      defaultValue={publishState.type}
      onChange={(key) => {
        if (isKindOfState(key)) {
          onChange(key);
        }
      }}
    >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          <ListBox.Item id="UNPUBLISHED" textValue="UNPUBLISHED">
            非公開
            <ListBox.ItemIndicator />
          </ListBox.Item>
          <ListBox.Item id="PUBLISHED" textValue="PUBLISHED">
            公開済み
            <ListBox.ItemIndicator />
          </ListBox.Item>
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
