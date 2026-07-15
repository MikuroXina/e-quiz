import { Button, Disclosure } from "@heroui/react";
import { Histogram } from "./histogram";
import { useMemo } from "react";

export interface HistogramDisclosureProps {
  id: string;
  label: string;
  nums: readonly number[];
}

export function HistogramDisclosure({ id, label, nums }: HistogramDisclosureProps) {
  const numsMin = useMemo(() => Math.min(...nums), [nums]);
  const numsMedian = useMemo(() => {
    const sorted = nums.toSorted();
    return sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
  }, [nums]);
  const numsMax = useMemo(() => Math.max(...nums), [nums]);

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
            <p>
              数値の範囲：{numsMin.toPrecision(3)} 〜 {numsMax.toPrecision(3)}
            </p>
            <p>中央値：{numsMedian.toPrecision(3)}</p>
          </div>
        </Disclosure.Body>
      </Disclosure.Content>
    </Disclosure>
  );
}
