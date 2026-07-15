import { EmptyState, Table, type SortDescriptor } from "@heroui/react";
import { useMemo, useState } from "react";
import type { Indicator } from "~/lib/model";

export interface StatsTableProps {
  indicators: readonly Indicator[];
}

export function StatsTable({ indicators: source }: StatsTableProps): React.JSX.Element {
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "studentName",
    direction: "ascending",
  });

  const indicators = useMemo(
    () =>
      [...source].sort((a, b) => {
        const col = sortDescriptor.column as keyof Indicator;
        const left = a[col];
        const right = b[col];
        const cmp =
          typeof left === "number" && typeof right === "number"
            ? right - left
            : a[col]!.toString().localeCompare(b[col]!.toString());
        return sortDescriptor.direction === "ascending" ? cmp : -cmp;
      }),
    [sortDescriptor],
  );

  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content sortDescriptor={sortDescriptor} onSortChange={setSortDescriptor}>
          <Table.Header>
            <Table.Column id="studentName" allowsSorting isRowHeader>
              {({ sortDirection }) => (
                <Table.SortableColumnHeader sortDirection={sortDirection}>
                  受講者名
                </Table.SortableColumnHeader>
              )}
            </Table.Column>
            <Table.Column id="corrects" allowsSorting>
              {({ sortDirection }) => (
                <Table.SortableColumnHeader sortDirection={sortDirection}>
                  正解数
                </Table.SortableColumnHeader>
              )}
            </Table.Column>
            <Table.Column id="progress" allowsSorting>
              {({ sortDirection }) => (
                <Table.SortableColumnHeader sortDirection={sortDirection}>
                  進捗
                </Table.SortableColumnHeader>
              )}
            </Table.Column>
            <Table.Column id="stumble" allowsSorting>
              {({ sortDirection }) => (
                <Table.SortableColumnHeader sortDirection={sortDirection}>
                  つまづき度
                </Table.SortableColumnHeader>
              )}
            </Table.Column>
            <Table.Column id="speed" allowsSorting>
              {({ sortDirection }) => (
                <Table.SortableColumnHeader sortDirection={sortDirection}>
                  学習の速さ
                </Table.SortableColumnHeader>
              )}
            </Table.Column>
            <Table.Column id="prudence" allowsSorting>
              {({ sortDirection }) => (
                <Table.SortableColumnHeader sortDirection={sortDirection}>
                  回答の慎重さ
                </Table.SortableColumnHeader>
              )}
            </Table.Column>
          </Table.Header>
          <Table.Body
            renderEmptyState={() => (
              <EmptyState className="flex h-full w-full flex-col items-center justify-center gap-4 text-center">
                <span className="text-muted text-sm">まだ受講者が居ません</span>
              </EmptyState>
            )}
          >
            {indicators.map(
              ({ studentId, studentName, corrects, progress, stumble, speed, prudence }) => (
                <Table.Row key={studentId} id={studentId}>
                  <Table.Cell>{studentName}</Table.Cell>
                  <Table.Cell>{corrects}</Table.Cell>
                  <Table.Cell>{progress}</Table.Cell>
                  <Table.Cell>{stumble == null ? "-" : stumble.toFixed(3)}</Table.Cell>
                  <Table.Cell>{speed == null ? "-" : speed.toPrecision(3)}</Table.Cell>
                  <Table.Cell>{prudence == null ? "-" : prudence.toPrecision(3)}</Table.Cell>
                </Table.Row>
              ),
            )}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}
