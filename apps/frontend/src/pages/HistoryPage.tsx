import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Badge,
  Card,
  Collapse,
  Group,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { api } from "../api/client";
import { useProjects, useUsers } from "../api/lookups";
import { PageHeader, QueryState, fmtDate } from "../components/ui";

type HistoryTaskItem = {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
  pmApproval: string;
  assigneeName: string | null;
};

type SprintHistoryItem = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  planned: number;
  completed: number;
  delayed: number;
  pmApproved: number;
  completionRate: number;
  tasks: HistoryTaskItem[];
};

type HistoryResponse = {
  summary: {
    totalCompletedSprints: number;
    overallCompletionRate: number;
    avgOnTimeRate: number;
    avgDelayedRate: number;
  };
  sprints: SprintHistoryItem[];
};

function shortSprintLabel(name: string): string {
  const m = /^Sprint (\d+) \((\d{4})\)$/.exec(name);
  if (!m?.[1] || !m[2]) return name;
  return `S${m[1]} '${m[2].slice(2)}`;
}

function AccomplishmentChart({ sprints }: { sprints: SprintHistoryItem[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (sprints.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        No sprint history available for the selected filters.
      </Text>
    );
  }

  const vbWidth = 760;
  const vbHeight = 250;
  const padLeft = 44;
  const padRight = 24;
  const padTop = 20;
  const padBottom = 42;
  const plotW = vbWidth - padLeft - padRight;
  const plotH = vbHeight - padTop - padBottom;

  const yTicks = [0, 25, 50, 75, 100];
  const xFor = (i: number) =>
    sprints.length === 1 ? padLeft + plotW / 2 : padLeft + (i / (sprints.length - 1)) * plotW;
  const yForPct = (pct: number) => padTop + plotH - (Math.min(100, Math.max(0, pct)) / 100) * plotH;

  const completionPts = sprints.map((s, i) => ({
    x: xFor(i),
    y: yForPct(s.completionRate),
    s,
  }));
  const onTimePts = sprints.map((s, i) => {
    const delayedRate = s.planned > 0 ? Math.round((s.delayed / s.planned) * 100) : 0;
    const onTimeRate = s.planned > 0 ? Math.max(0, 100 - delayedRate) : 0;
    return { x: xFor(i), y: yForPct(onTimeRate), rate: onTimeRate };
  });

  const linePath = completionPts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const firstPt = completionPts[0];
  const lastPt = completionPts[completionPts.length - 1];
  const areaPath =
    firstPt && lastPt
      ? `${linePath} L ${lastPt.x.toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${firstPt.x.toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`
      : "";
  const onTimePath = onTimePts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const active = hoveredIdx !== null ? sprints[hoveredIdx] : null;

  return (
    <div>
      <Group justify="space-between" align="center" mb="sm" wrap="wrap">
        <Group gap="md">
          <Group gap={6}>
            <span
              style={{
                width: 10,
                height: 3,
                borderRadius: 2,
                backgroundColor: "#0F4C8A",
                display: "inline-block",
              }}
            />
            <Text size="xs" c="dimmed" fw={600}>
              Completion %
            </Text>
          </Group>
          <Group gap={6}>
            <span
              style={{
                width: 10,
                height: 3,
                borderRadius: 2,
                backgroundColor: "#14603F",
                display: "inline-block",
              }}
            />
            <Text size="xs" c="dimmed" fw={600}>
              On-Time %
            </Text>
          </Group>
        </Group>
        {active ? (
          <Group gap="sm">
            <Text size="xs" fw={700}>
              {active.name}
            </Text>
            <Badge size="xs" color="blue" variant="light">
              {active.completed}/{active.planned} done ({active.completionRate}%)
            </Badge>
            <Badge size="xs" color={active.delayed > 0 ? "red" : "green"} variant="light">
              {active.delayed} delayed
            </Badge>
          </Group>
        ) : (
          <Text size="xs" c="dimmed">
            Hover a sprint point for details
          </Text>
        )}
      </Group>

      <svg
        viewBox={`0 0 ${vbWidth} ${vbHeight}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        role="img"
        aria-label="Sprint accomplishment trend chart"
      >
        <defs>
          <linearGradient id="sprintCompletionFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0F4C8A" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#0F4C8A" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Horizontal Gridlines & Y-Axis Labels */}
        {yTicks.map((tick) => {
          const y = yForPct(tick);
          return (
            <g key={tick}>
              <line
                x1={padLeft}
                x2={vbWidth - padRight}
                y1={y}
                y2={y}
                stroke="#E2E8F0"
                strokeDasharray={tick === 0 ? undefined : "3 3"}
              />
              <text
                x={padLeft - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="#586679"
                style={{ fontFamily: "IBM Plex Mono, system-ui, sans-serif" }}
              >
                {tick}%
              </text>
            </g>
          );
        })}

        {/* Area Fill under Completion % */}
        {areaPath ? <path d={areaPath} fill="url(#sprintCompletionFill)" /> : null}

        {/* On-Time % Dashed Reference Line */}
        {onTimePath ? (
          <path
            d={onTimePath}
            fill="none"
            stroke="#14603F"
            strokeWidth={2}
            strokeDasharray="5 4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {/* Completion % Primary Trend Line */}
        {linePath ? (
          <path
            d={linePath}
            fill="none"
            stroke="#0F4C8A"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {/* Data Points & X-Axis Labels */}
        {completionPts.map((pt, idx) => {
          const isHovered = hoveredIdx === idx;
          return (
            <g
              key={pt.s.id}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{ cursor: "pointer" }}
            >
              {isHovered ? (
                <line
                  x1={pt.x}
                  x2={pt.x}
                  y1={padTop}
                  y2={padTop + plotH}
                  stroke="#CBD5E1"
                  strokeDasharray="2 2"
                />
              ) : null}
              {onTimePts[idx] ? (
                <circle
                  cx={pt.x}
                  cy={onTimePts[idx].y}
                  r={isHovered ? 5 : 3.5}
                  fill="#FFFFFF"
                  stroke="#14603F"
                  strokeWidth={2}
                />
              ) : null}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isHovered ? 6 : 4.5}
                fill={pt.s.delayed > 0 ? "#FFC629" : "#0F4C8A"}
                stroke="#FFFFFF"
                strokeWidth={2}
              />
              <text
                x={pt.x}
                y={vbHeight - 14}
                textAnchor="middle"
                fontSize="11"
                fontWeight={isHovered ? 700 : 500}
                fill={isHovered ? "#0F172A" : "#586679"}
                style={{ fontFamily: "IBM Plex Mono, system-ui, sans-serif" }}
              >
                {shortSprintLabel(pt.s.name)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function HistoryPage() {
  const [projectId, setProjectId] = useState<string | undefined>();
  const [assigneeId, setAssigneeId] = useState<string | undefined>();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const projects = useProjects();
  const users = useUsers();

  const query = useQuery({
    queryKey: ["history", projectId ?? null, assigneeId ?? null],
    queryFn: () =>
      api.get<HistoryResponse>("/history", {
        ...(projectId ? { projectId } : {}),
        ...(assigneeId ? { assigneeId } : {}),
      }),
  });

  return (
    <>
      <PageHeader
        title="History"
        subtitle="Chronological sprint accomplishment and delivery metrics"
      />
      <Group mb="md" align="flex-end" wrap="wrap">
        <Select
          label="Project"
          placeholder="All projects"
          clearable
          searchable
          value={projectId ?? null}
          onChange={(v) => setProjectId(v ?? undefined)}
          data={(projects.data ?? []).map((p) => ({ value: p.id, label: p.name }))}
        />
        <Select
          label="Assignee"
          placeholder="Everyone"
          clearable
          searchable
          value={assigneeId ?? null}
          onChange={(v) => setAssigneeId(v ?? undefined)}
          data={(users.data ?? [])
            .filter((u) => u.isActive)
            .map((u) => ({ value: u.id, label: u.fullName }))}
        />
      </Group>

      <QueryState query={query}>
        {(data) => (
          <Stack gap="lg">
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
              <Paper withBorder p="md" radius="md">
                <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                  Completed Sprints
                </Text>
                <Title order={2}>{data.summary.totalCompletedSprints}</Title>
              </Paper>
              <Paper withBorder p="md" radius="md">
                <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                  Overall Completion
                </Text>
                <Title order={2}>{data.summary.overallCompletionRate}%</Title>
              </Paper>
              <Paper withBorder p="md" radius="md">
                <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                  Avg On-Time Rate
                </Text>
                <Title order={2}>{data.summary.avgOnTimeRate}%</Title>
              </Paper>
              <Paper withBorder p="md" radius="md">
                <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                  Avg Delayed Rate
                </Text>
                <Title order={2}>{data.summary.avgDelayedRate}%</Title>
              </Paper>
            </SimpleGrid>

            <Card withBorder p="md" radius="md">
              <Title order={4} mb="sm">
                Sprint Accomplishment
              </Title>
              <AccomplishmentChart sprints={data.sprints} />
            </Card>

            <Card withBorder p={0} radius="md">
              <Table verticalSpacing="sm" highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Sprint</Table.Th>
                    <Table.Th>Date Range</Table.Th>
                    <Table.Th>Planned</Table.Th>
                    <Table.Th>Completed</Table.Th>
                    <Table.Th>Delayed</Table.Th>
                    <Table.Th>PM Approved</Table.Th>
                    <Table.Th>Completion %</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {data.sprints.map((s) => (
                    <>
                      <Table.Tr
                        key={s.id}
                        style={{ cursor: "pointer" }}
                        onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                      >
                        <Table.Td fw={600}>{s.name}</Table.Td>
                        <Table.Td>
                          {fmtDate(s.startDate)} – {fmtDate(s.endDate)}
                        </Table.Td>
                        <Table.Td>{s.planned}</Table.Td>
                        <Table.Td>{s.completed}</Table.Td>
                        <Table.Td>{s.delayed}</Table.Td>
                        <Table.Td>{s.pmApproved}</Table.Td>
                        <Table.Td>
                          <Badge color={s.completionRate >= 80 ? "green" : "blue"} variant="light">
                            {s.completionRate}%
                          </Badge>
                        </Table.Td>
                      </Table.Tr>
                      {expandedId === s.id ? (
                        <Table.Tr key={`${s.id}-tasks`}>
                          <Table.Td colSpan={7}>
                            <Collapse in={true}>
                              <Stack gap={4} p="xs">
                                {s.tasks.length === 0 ? (
                                  <Text size="xs" c="dimmed">
                                    No tasks in this sprint.
                                  </Text>
                                ) : (
                                  s.tasks.map((t) => (
                                    <Group key={t.id} justify="space-between">
                                      <Text size="sm">{t.title}</Text>
                                      <Group gap="xs">
                                        <Badge size="xs" variant="outline">
                                          {t.status}
                                        </Badge>
                                        <Text size="xs" c="dimmed">
                                          {t.assigneeName ?? "Unassigned"}
                                        </Text>
                                      </Group>
                                    </Group>
                                  ))
                                )}
                              </Stack>
                            </Collapse>
                          </Table.Td>
                        </Table.Tr>
                      ) : null}
                    </>
                  ))}
                </Table.Tbody>
              </Table>
            </Card>
          </Stack>
        )}
      </QueryState>
    </>
  );
}
