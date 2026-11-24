import { Button, Group, Text } from "@mantine/core";

export const DEFAULT_PAGE_SIZE = 20;

export function paginateItems<T>(
  items: readonly T[],
  page: number,
  pageSize = DEFAULT_PAGE_SIZE,
): {
  items: T[];
  page: number;
  totalPages: number;
  total: number;
  start: number;
  end: number;
} {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const clampedPage = Math.min(Math.max(1, page), totalPages);
  const offset = (clampedPage - 1) * pageSize;
  const sliced = items.slice(offset, offset + pageSize);
  const start = total === 0 ? 0 : offset + 1;
  const end = offset + sliced.length;
  return { items: sliced, page: clampedPage, totalPages, total, start, end };
}

export function PaginationBar({
  page,
  total,
  pageSize = DEFAULT_PAGE_SIZE,
  onPageChange,
}: {
  page: number;
  total: number;
  pageSize?: number;
  onPageChange: (nextPage: number) => void;
}) {
  if (total <= pageSize) return null;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  const start = (current - 1) * pageSize + 1;
  const end = Math.min(total, current * pageSize);

  return (
    <Group
      justify="space-between"
      align="center"
      pt="xs"
      data-testid="pagination-bar"
      style={{ borderTop: "1px solid var(--mantine-color-gray-2)" }}
    >
      <Text size="xs" c="dimmed" style={{ fontVariantNumeric: "tabular-nums" }}>
        {start}–{end} of {total}
      </Text>
      <Group gap="xs">
        <Button
          size="xs"
          variant="default"
          disabled={current <= 1}
          onClick={() => onPageChange(current - 1)}
        >
          Prev
        </Button>
        <Text size="xs" fw={600} style={{ fontVariantNumeric: "tabular-nums" }}>
          {current} / {totalPages}
        </Text>
        <Button
          size="xs"
          variant="default"
          disabled={current >= totalPages}
          onClick={() => onPageChange(current + 1)}
        >
          Next
        </Button>
      </Group>
    </Group>
  );
}
