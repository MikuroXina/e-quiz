import { Button, Disclosure } from "@heroui/react";
import { Histogram } from "./histogram";

export interface HistogramDisclosureProps {
  id: string;
  label: string;
  nums: readonly number[];
}

export function HistogramDisclosure({ id, label, nums }: HistogramDisclosureProps) {
  return (
    <Disclosure id={id}>
      <Disclosure.Heading>
        <Button slot="trigger" variant="ghost">
          {label}
          <Disclosure.Indicator />
        </Button>
      </Disclosure.Heading>
      <Disclosure.Content>
        <Disclosure.Body>
          <div>
            <Histogram nums={nums} label={label} bins={8} />
          </div>
        </Disclosure.Body>
      </Disclosure.Content>
    </Disclosure>
  );
}
