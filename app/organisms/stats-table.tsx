import { EmptyState, Table } from "@heroui/react";
import type { Indicator } from "~/lib/model";

export interface StatsTableProps {
  indicators: readonly Indicator[];
}

export function StatsTable({ indicators }: StatsTableProps): React.JSX.Element {
  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content>
          <Table.Header>
            <Table.Column isRowHeader>受講者名</Table.Column>
            <Table.Column>正解数</Table.Column>
            <Table.Column>進捗</Table.Column>
            <Table.Column>つまづき度</Table.Column>
            <Table.Column>学習の速さ</Table.Column>
            <Table.Column>回答の慎重さ</Table.Column>
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
                <Table.Row key={studentId}>
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
