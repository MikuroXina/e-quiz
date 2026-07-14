import { useMemo } from "react";
import { Bar } from "react-chartjs-2";

export interface HistogramProps {
  bins: number;
  nums: readonly number[];
  label: string;
}

export function Histogram({ bins, nums, label }: HistogramProps): React.JSX.Element {
  const numsMin = useMemo(() => Math.min(...nums), [nums]);
  const numsMax = useMemo(() => Math.max(...nums), [nums]);
  const binWidth = (numsMax - numsMin) / bins;
  const binCounts = useMemo(() => {
    const counts = [...new Array(bins)].map(() => 0);
    for (const num of nums) {
      for (let i = 0; i < bins; ++i) {
        if (num <= (i + 1) * binWidth + numsMin) {
          counts[i] += 1;
          break;
        }
      }
    }
    return counts;
  }, [nums]);

  return (
    <Bar
      data={{
        labels: [...new Array(bins)].map(
          (_, i) =>
            `${(i * binWidth + numsMin).toFixed(3)} - ${((i + 1) * binWidth + numsMin).toFixed(3)}`,
        ),
        datasets: [
          {
            label,
            data: binCounts,
            backgroundColor: "rgba(53, 162, 235, 0.5)",
            categoryPercentage: 1,
          },
        ],
      }}
    />
  );
}
