import { useState, type ReactNode } from "react";
import { ActionIcon, Button, Group, Popover, Stack, Table, Text, UnstyledButton } from "@mantine/core";

export type SortConfig<TKey extends string = string> = {
  key: TKey | null;
  direction: "asc" | "desc";
};

export function compareNullable(a: string | null, b: string | null, dir: "asc" | "desc"): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  const cmp = a.localeCompare(b);
  return dir === "asc" ? cmp : -cmp;
}

export function toggleSortConfig<TKey extends string>(
  prev: SortConfig<TKey>,
  key: TKey,
): SortConfig<TKey> {
  if (prev.key !== key) return { key, direction: "asc" };
  if (prev.direction === "asc") return { key, direction: "desc" };
  return { key: null, direction: "asc" };
}

export function ColumnHeader<TKey extends string>({
  label,
  colKey,
  sort,
  onSort,
  activeFilterCount = 0,
  onClearFilter,
  align = "left",
  children,
}: {
  label: string;
  colKey: TKey;
  sort: SortConfig<TKey>;
  onSort: (key: TKey) => void;
  activeFilterCount?: number;
  onClearFilter?: () => void;
  align?: "left" | "center";
  children?: ReactNode;
}) {
  const [opened, setOpened] = useState(false);
  const isSorted = sort.key === colKey;
  const ariaSort = isSorted ? (sort.direction === "asc" ? "ascending" : "descending") : "none";
  const sortIcon = isSorted ? (sort.direction === "asc" ? "↑" : "↓") : "↕";

  return (
    <Table.Th aria-sort={ariaSort}>
      <Group gap={4} wrap="nowrap" justify={align === "center" ? "center" : "space-between"}>
        <UnstyledButton
          type="button"
          onClick={() => onSort(colKey)}
          fw={700}
          fz="sm"
          style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
        >
          <span>{label}</span>
          <Text span size="xs" c={isSorted ? "navy" : "dimmed"} aria-hidden="true">
            {sortIcon}
          </Text>
        </UnstyledButton>
        {children ? (
          <Popover
            opened={opened}
            onChange={setOpened}
            position="bottom-start"
            withArrow
            shadow="md"
          >
            <Popover.Target>
              <ActionIcon
                type="button"
                size="xs"
                variant={activeFilterCount > 0 ? "filled" : "subtle"}
                color={activeFilterCount > 0 ? "navy" : "gray"}
                aria-label={`Filter ${label}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpened((o) => !o);
                }}
              >
                <Text span fz={11} lh={1}>
                  ⧗
                </Text>
              </ActionIcon>
            </Popover.Target>
            <Popover.Dropdown p="xs" miw={200} onClick={(e) => e.stopPropagation()}>
              <Stack gap="xs">
                {children}
                {onClearFilter ? (
                  <Group justify="flex-end">
                    <Button
                      size="compact-xs"
                      variant="subtle"
                      onClick={() => {
                        onClearFilter();
                        setOpened(false);
                      }}
                    >
                      Clear
                    </Button>
                  </Group>
                ) : null}
              </Stack>
            </Popover.Dropdown>
          </Popover>
        ) : null}
      </Group>
    </Table.Th>
  );
}
