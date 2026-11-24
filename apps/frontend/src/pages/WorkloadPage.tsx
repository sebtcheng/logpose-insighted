import {
  Button,
  Checkbox,
  Collapse,
  Group,
  Progress,
  Stack,
  Table,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import { Fragment, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { sortTasksOngoingFirst, type WorkItem, type WorkloadSprintMetrics } from "@myapp/shared";
import { ColumnHeader, compareNullable, toggleSortConfig, type SortConfig } from "../components/ColumnHeader";
import { PaginationBar, paginateItems } from "../components/PaginationBar";
import { WorkItemsTable } from "../components/WorkItems";
import { useProjects, useWorkload } from "../api/hooks";
import { PageHeader, QueryState } from "../components/ui";

const NUM_STYLE = { fontVariantNumeric: "tabular-nums" as const };

function getWorkloadProgressColor(pct: number): string {
  if (pct >= 100) return "#1E9E6A";
  if (pct >= 75) return "#2D7D9A";
  if (pct >= 40) return "#0B2D5E";
  if (pct > 0) return "#B45309";
  return "#E3EAF2";
}

function SprintMetricCells({ m }: { m: WorkloadSprintMetrics }) {
  const pct =
    m.currentSprintTotal > 0
      ? Math.round((m.currentSprintCompleted / m.currentSprintTotal) * 100)
      : 0;
  const barColor = getWorkloadProgressColor(pct);
  return (
    <>
      <Table.Td miw={180}>
        <Stack gap={4}>
          <Group justify="space-between" gap="xs">
            <Text size="sm" fw={700} style={{ ...NUM_STYLE, color: "#0B2D5E" }}>
              {m.currentSprintCompleted} / {m.currentSprintTotal}
            </Text>
            <Text size="xs" fw={600} style={{ ...NUM_STYLE, color: "#5A6E7A" }}>
              {pct}%
            </Text>
          </Group>
          <Progress
            value={pct}
            color={barColor}
            size="sm"
            radius="xl"
            aria-label="Current sprint progress"
            styles={{ root: { backgroundColor: "#E3EAF2" } }}
          />
        </Stack>
      </Table.Td>
      <Table.Td ta="center">
        {m.sprintBacklog > 0 ? (
          <Text
            size="sm"
            fw={700}
            style={{
              ...NUM_STYLE,
              display: "inline-block",
              backgroundColor: "#FDE8E8",
              color: "#B42318",
              borderRadius: 999,
              padding: "2px 10px",
            }}
          >
            {m.sprintBacklog}
          </Text>
        ) : (
          <Text size="sm" fw={600} style={{ ...NUM_STYLE, color: "#5A6E7A" }}>
            {m.sprintBacklog}
          </Text>
        )}
      </Table.Td>
      <Table.Td ta="center">
        <Text size="md" fw={700} style={{ ...NUM_STYLE, color: "#0B2D5E" }}>
          {m.upcomingSprintsTotal}
        </Text>
      </Table.Td>
      <Table.Td ta="center">
        <Text size="md" fw={800} style={{ ...NUM_STYLE, color: "#0B2D5E" }}>
          {m.completedTasksTotal}
        </Text>
      </Table.Td>
    </>
  );
}

function WorkList({
  items,
  projectNames,
}: {
  items: WorkItem[];
  projectNames: Map<string, string>;
}) {
  const [page, setPage] = useState(1);
  if (items.length === 0) {
    return (
      <Text c="dimmed" size="sm" p="sm">
        No items.
      </Text>
    );
  }
  const paged = paginateItems(items, page);
  return (
    <div style={{ padding: "8px 12px 12px" }}>
      <div style={{ maxHeight: 420, overflowY: "auto" }}>
        <WorkItemsTable items={paged.items} projectNames={projectNames} checkable deletable />
      </div>
      <PaginationBar page={paged.page} total={paged.total} onPageChange={setPage} />
    </div>
  );
}

type WorkloadSortKey =
  | "person"
  | "owner"
  | "teamMember"
  | "currentSprintProgress"
  | "sprintBacklog"
  | "upcomingSprints"
  | "completedTasks";
type WorkloadNumKey = Exclude<WorkloadSortKey, "person">;

const NUM_COLS: Array<{ key: WorkloadNumKey; label: string }> = [
  { key: "owner", label: "Owner" },
  { key: "teamMember", label: "Team Member" },
  { key: "currentSprintProgress", label: "Current Sprint Progress" },
  { key: "sprintBacklog", label: "Sprint Backlog" },
  { key: "upcomingSprints", label: "Upcoming Sprints" },
  { key: "completedTasks", label: "Completed Tasks" },
];

export function WorkloadPage() {
  const [params, setParams] = useSearchParams();
  const expanded = params.get("person");
  const query = useWorkload();
  const projects = useProjects();
  const [sort, setSort] = useState<SortConfig<WorkloadSortKey>>({ key: null, direction: "asc" });
  const [personFilter, setPersonFilter] = useState("");
  const [numFilters, setNumFilters] = useState<Partial<Record<WorkloadNumKey, string[]>>>({});

  const hasFilters =
    Boolean(personFilter.trim()) ||
    Object.values(numFilters).some((v) => v && v.length > 0);
  const clearAllFilters = () => {
    setPersonFilter("");
    setNumFilters({});
  };
  // The roster is org-wide, so a person can have work in projects the viewer is not on: names come from the response.
  const projectNames = new Map<string, string>([
    ...(projects.data ?? []).map((p): [string, string] => [p.id, p.name]),
    ...Object.entries(query.data?.projectNames ?? {}),
  ]);
  const toggle = (id: string) => {
    const next = new URLSearchParams(params);
    if (expanded === id) next.delete("person");
    else next.set("person", id);
    setParams(next, { replace: true });
  };
  return (
    <>
      <PageHeader
        variant="workload"
        title="Workload"
        subtitle="Load and capacity across all subprojects. This shows counts against limits, not performance."
      />
      <QueryState query={query} isEmpty={(d) => d.items.length === 0} empty="No active people.">
        {(data) => {
          const byUser = new Map(data.members.map((m) => [m.userId, m]));
          const unassigned = byUser.get(null);
          const getNum = (
            r: (typeof data.items)[number],
            key: WorkloadNumKey,
          ): number => {
            switch (key) {
              case "owner":
                return r.ownedProjectsCount ?? 0;
              case "teamMember":
                return r.teamMemberProjectsCount ?? 0;
              case "currentSprintProgress":
                return r.currentSprintTotal > 0
                  ? Math.round((r.currentSprintCompleted / r.currentSprintTotal) * 100)
                  : 0;
              case "sprintBacklog":
                return r.sprintBacklog ?? 0;
              case "upcomingSprints":
                return r.upcomingSprintsTotal ?? 0;
              case "completedTasks":
                return r.completedTasksTotal ?? 0;
            }
          };
          const qPerson = personFilter.trim().toLowerCase();
          const filtered = data.items.filter((r) => {
            if (qPerson && !r.fullName.toLowerCase().includes(qPerson)) return false;
            for (const col of NUM_COLS) {
              const sel = numFilters[col.key];
              if (sel && sel.length > 0 && !sel.includes(String(getNum(r, col.key)))) {
                return false;
              }
            }
            return true;
          });
          const sorted = !sort.key
            ? filtered
            : [...filtered].sort((a, b) => {
                if (sort.key === "person") {
                  return compareNullable(
                    a.fullName.toLowerCase(),
                    b.fullName.toLowerCase(),
                    sort.direction,
                  );
                }
                const diff = getNum(a, sort.key!) - getNum(b, sort.key!);
                return sort.direction === "asc" ? diff : -diff;
              });
          const handleSort = (key: WorkloadSortKey) =>
            setSort((prev) => toggleSortConfig(prev, key));

          return (
            <>
              {hasFilters ? (
                <Group justify="flex-end" mb="xs">
                  <Button size="compact-xs" variant="subtle" onClick={clearAllFilters}>
                    Clear filters
                  </Button>
                </Group>
              ) : null}
              <Table.ScrollContainer minWidth={700}>
                <style>
                  {
                    ".workload-table-head th, .workload-table-head button, .workload-table-head span { color: #FFFFFF !important; }"
                  }
                </style>
                <Table verticalSpacing="xs">
                  <Table.Thead
                    className="workload-table-head"
                    style={{ backgroundColor: "#0B2D5E", color: "#FFFFFF" }}
                  >
                    <Table.Tr>
                      <ColumnHeader
                        label="Person"
                        colKey="person"
                        sort={sort}
                        onSort={handleSort}
                        activeFilterCount={personFilter ? 1 : 0}
                        onClearFilter={() => setPersonFilter("")}
                      >
                        <TextInput
                          size="xs"
                          placeholder="Search person..."
                          value={personFilter}
                          onChange={(e) => setPersonFilter(e.currentTarget.value)}
                        />
                      </ColumnHeader>
                      {NUM_COLS.map((col) => {
                        const opts = [
                          ...new Set(data.items.map((r) => String(getNum(r, col.key)))),
                        ].sort((a, b) => Number(a) - Number(b));
                        const selected = numFilters[col.key] ?? [];
                        return (
                          <ColumnHeader
                            key={col.key}
                            label={col.label}
                            colKey={col.key}
                            sort={sort}
                            onSort={handleSort}
                            align={col.key === "currentSprintProgress" ? "left" : "center"}
                            activeFilterCount={selected.length}
                            onClearFilter={() =>
                              setNumFilters((prev) => ({ ...prev, [col.key]: [] }))
                            }
                          >
                            <Checkbox.Group
                              value={selected}
                              onChange={(v) =>
                                setNumFilters((prev) => ({ ...prev, [col.key]: v }))
                              }
                            >
                              <Stack gap={4}>
                                {opts.map((opt) => (
                                  <Checkbox key={opt} size="xs" value={opt} label={opt} />
                                ))}
                              </Stack>
                            </Checkbox.Group>
                          </ColumnHeader>
                        );
                      })}
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {sorted.map((r) => (
                    <Fragment key={r.userId}>
                      <Table.Tr
                        onClick={() => toggle(r.userId)}
                        style={{ cursor: "pointer" }}
                      >
                        <Table.Td>
                          <UnstyledButton
                            aria-expanded={expanded === r.userId}
                            fw={600}
                          >
                            {expanded === r.userId ? "▾ " : "▸ "}
                            {r.fullName}
                          </UnstyledButton>
                        </Table.Td>
                        <Table.Td data-col="owner" ta="center">
                          <Text size="md" fw={700} style={NUM_STYLE}>
                            {r.ownedProjectsCount ?? 0}
                          </Text>
                        </Table.Td>
                        <Table.Td data-col="team-member" ta="center">
                          <Text size="md" fw={700} style={NUM_STYLE}>
                            {r.teamMemberProjectsCount ?? 0}
                          </Text>
                        </Table.Td>
                        <SprintMetricCells m={r} />
                      </Table.Tr>
                      <Table.Tr key={`${r.userId}-items`}>
                        <Table.Td
                          colSpan={7}
                          p={0}
                          style={{ borderBottom: expanded === r.userId ? undefined : "none" }}
                        >
                          <Collapse in={expanded === r.userId}>
                            {expanded === r.userId ? (
                              <WorkList
                                items={sortTasksOngoingFirst(byUser.get(r.userId)?.items ?? [])}
                                projectNames={projectNames}
                              />
                            ) : null}
                          </Collapse>
                        </Table.Td>
                      </Table.Tr>
                    </Fragment>
                  ))}
                  {unassigned ? (
                    <Fragment key="unassigned">
                      <Table.Tr
                        onClick={() => toggle("unassigned")}
                        style={{ cursor: "pointer" }}
                      >
                        <Table.Td>
                          <UnstyledButton
                            aria-expanded={expanded === "unassigned"}
                            fw={600}
                          >
                            {expanded === "unassigned" ? "▾ " : "▸ "}Unassigned
                          </UnstyledButton>
                        </Table.Td>
                        <Table.Td data-col="owner" ta="center">
                          <Text size="md" fw={700} c="dimmed" style={NUM_STYLE}>
                            —
                          </Text>
                        </Table.Td>
                        <Table.Td data-col="team-member" ta="center">
                          <Text size="md" fw={700} c="dimmed" style={NUM_STYLE}>
                            —
                          </Text>
                        </Table.Td>
                        <SprintMetricCells
                          m={
                            data.unassigned ?? {
                              currentSprintCompleted: 0,
                              currentSprintTotal: 0,
                              sprintBacklog: 0,
                              upcomingSprintsTotal: 0,
                              completedTasksTotal: 0,
                            }
                          }
                        />
                      </Table.Tr>
                      <Table.Tr>
                        <Table.Td colSpan={7} p={0} style={{ borderBottom: "none" }}>
                          <Collapse in={expanded === "unassigned"}>
                            <WorkList items={unassigned.items} projectNames={projectNames} />
                          </Collapse>
                        </Table.Td>
                      </Table.Tr>
                    </Fragment>
                  ) : null}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
            </>
          );
        }}
      </QueryState>
    </>
  );
}
