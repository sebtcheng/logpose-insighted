import { memo, useMemo } from "react";
import { Alert, Badge, Card, Group, Select, Stack, Switch, Text, Title } from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import { useSearchParams } from "react-router-dom";
import {
  sortTasksOngoingFirst,
  type HomeResponse,
  type HomeRow,
  type WorkItem,
} from "@myapp/shared";
import { WorkItemsView, WorkViewSwitch, type WorkView } from "../components/WorkItems";
import { useHome, useProjects, useSubprojects, useUsers, useCurrentProject } from "../api/hooks";
import { useAuth, useIsPm } from "../auth";
import { ActivityRow } from "../components/ActivityRow";
import { PageHeader, QueryState, fmtDate } from "../components/ui";
import { applyHomeFilters, parseHomeFilters } from "../lib/filters";

function groupBy(rows: HomeRow[]): Array<{ key: string; label: string; rows: HomeRow[] }> {
  const map = new Map<string, { key: string; label: string; rows: HomeRow[] }>();
  for (const r of rows) {
    const key = r.subprojectId ?? "none";
    const label = r.subprojectCode
      ? `${r.subprojectCode} ${r.subprojectName ?? ""}`
      : "No subproject";
    const g = map.get(key) ?? { key, label, rows: [] };
    g.rows.push(r);
    map.set(key, g);
  }
  return [...map.values()];
}

const Section = memo(function Section({
  title,
  rows,
  grouped,
  extra,
  moduleRows = [],
  view,
  projectNames,
}: {
  title: string;
  rows: HomeRow[];
  moduleRows?: WorkItem[];
  grouped: boolean;
  extra?: React.ReactNode;
  view: WorkView;
  projectNames: Map<string, string>;
}) {
  const isNextWeek = title === "Next Sprint";
  const risky = isNextWeek ? rows.filter((r) => r.atRisk) : [];
  return (
    <Card withBorder padding={0} className={title === "Current Sprint" ? "lp-card-coral" : undefined}>
      <Group justify="space-between" p="md" style={{ borderBottom: "var(--outline)" }}>
        <Title order={2} className="lp-section-title">
          {title}
        </Title>
        <Badge variant="filled" color="navy">
          {rows.length + moduleRows.length}
        </Badge>
      </Group>
      {isNextWeek && risky.length > 0 ? (
        <Alert color="sun" m="sm" title="Risk coming up">
          {risky.length} item{risky.length === 1 ? " is" : "s are"} blocked or waiting on another
          activity before next week.
        </Alert>
      ) : null}
      {extra}
      {moduleRows.length > 0 ? (
        <div style={{ borderBottom: "var(--outline-thin)" }}>
          <Text className="lp-kicker" px="md" pt="sm">
            Other modules
          </Text>
          <WorkItemsView items={moduleRows} view={view} projectNames={projectNames} checkable />
        </div>
      ) : null}
      {rows.length === 0 && !extra && moduleRows.length === 0 ? (
        <Text c="dimmed" size="sm" p="md">
          Nothing due.
        </Text>
      ) : grouped ? (
        groupBy(rows).map((g) => (
          <div key={g.key}>
            <Text className="lp-kicker" px="md" pt="sm">
              {g.label}
            </Text>
            {g.rows.map((r) => (
              <ActivityRow key={r.id} activity={r} checkable />
            ))}
          </div>
        ))
      ) : (
        rows.map((r) => <ActivityRow key={r.id} activity={r} checkable />)
      )}
    </Card>
  );
});

const NAVY = "#0B2F5E";
const GOLD = "#F5C83B";
const BLUE = "#1E4E9C";
const GREEN = "#12794F";
const RED = "#D93A3A";
const MISTY = "#EAF3F1";
const LABEL_FONT = "Inter, system-ui, sans-serif";

export const Header = memo(function Header({ data }: { data: HomeResponse }) {
  const { sprintSummary, activeSprint, carryOver } = data;
  const pct = activeSprint ? sprintSummary.completionRate : 0;

  // The donut shows open versus finished work; Delayed and On Time are schedule views over the same tasks.
  const donutSegments = [
    { label: "Ongoing", value: sprintSummary.ongoing, color: BLUE },
    { label: "Completed", value: sprintSummary.completed, color: GREEN },
  ];
  const donutTotal = donutSegments.reduce((acc, s) => acc + s.value, 0);
  const size = 148;
  const stroke = 18;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  const rows = [
    { key: "ongoing", label: "Ongoing", value: sprintSummary.ongoing, bg: "#E1E8F4", fg: BLUE },
    {
      key: "completed",
      label: "Completed",
      value: sprintSummary.completed,
      bg: "#E1F1E9",
      fg: GREEN,
    },
  ];
  const delayed = sprintSummary.delayed;
  const label: React.CSSProperties = {
    fontFamily: LABEL_FONT,
    fontSize: "0.6875rem",
    fontWeight: 600,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  };
  const tile: React.CSSProperties = {
    borderRadius: 6,
    padding: "8px 12px",
    whiteSpace: "nowrap",
    gap: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  };

  return (
    <div
      data-testid="sprint-telemetry-card"
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 55fr) minmax(0, 45fr)",
        gap: 16,
        marginBottom: "var(--mantine-spacing-lg)",
        fontFamily: LABEL_FONT,
      }}
    >
      <div
        data-testid="sprint-hero-panel"
        style={{
          background: NAVY,
          color: "#FFFFFF",
          borderTop: `3px solid ${RED}`,
          borderRadius: 8,
          padding: "20px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <Group justify="space-between" align="flex-start" wrap="nowrap" gap="md">
          <div>
            <Text style={{ ...label, color: "#C9D6EA" }}>Current sprint</Text>
            <Title
              order={2}
              style={{ color: "#FFFFFF", fontSize: "2.25rem", fontWeight: 700, lineHeight: 1.1 }}
            >
              {activeSprint ? activeSprint.name : "No active sprint"}
            </Title>
          </div>
          {activeSprint ? (
            <div
              data-testid="sprint-days-left"
              style={{
                background: GOLD,
                color: NAVY,
                borderRadius: 8,
                padding: "8px 14px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ fontSize: "2rem", fontWeight: 700, lineHeight: 1 }}>
                {activeSprint.daysLeft}
              </span>
              <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
                <span style={{ fontSize: "0.8125rem", fontWeight: 700 }}>
                  day{activeSprint.daysLeft === 1 ? "" : "s"} left
                </span>
                <span style={{ fontSize: "0.6875rem", fontWeight: 500 }}>
                  Ends {fmtDate(activeSprint.endDate)}
                </span>
              </span>
            </div>
          ) : null}
        </Group>

        <div>
          <Text style={{ ...label, color: "#C9D6EA" }} mb={6}>
            Current sprint progress
          </Text>
          <Group justify="space-between" align="baseline" mb={8}>
            <Text size="sm" style={{ color: "#FFFFFF" }}>
              {activeSprint
                ? `${sprintSummary.completed} of ${sprintSummary.total} tasks completed`
                : "No active sprint"}
            </Text>
            <Text
              fw={700}
              data-testid="sprint-progress-pct"
              style={{ color: "#FFFFFF", fontSize: "1.5rem", lineHeight: 1 }}
            >
              {pct}%
            </Text>
          </Group>
          <div
            role="progressbar"
            aria-label="Current sprint completion"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            style={{
              height: 10,
              background: "rgba(255,255,255,0.16)",
              borderRadius: 5,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: "100%",
                background: GOLD,
                borderRadius: 5,
                transition: "width 160ms cubic-bezier(0.2, 0, 0, 1)",
              }}
            />
          </div>
        </div>

        {carryOver ? (
          <div
            data-testid="sprint-backlog"
            style={{
              background: "rgba(245, 200, 59, 0.12)",
              borderLeft: `4px solid ${GOLD}`,
              color: "#FFFFFF",
              borderRadius: 8,
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div>
              <Text style={{ ...label, color: GOLD }}>Sprint Backlogs</Text>
              <Text size="xs" style={{ color: "#C9D6EA" }}>
                Open tasks carried over from previous sprints
              </Text>
            </div>
            <Text style={{ color: "#FFFFFF", whiteSpace: "nowrap" }}>
              <span style={{ fontSize: "1.5rem", fontWeight: 700, color: GOLD }}>
                {carryOver.count}
              </span>
              <span style={{ fontSize: "0.8125rem" }}> task{carryOver.count === 1 ? "" : "s"}</span>
            </Text>
          </div>
        ) : null}
      </div>

      <div
        data-testid="task-breakdown-panel"
        style={{
          background: "#FFFFFF",
          borderTop: `3px solid ${GOLD}`,
          borderRadius: 8,
          padding: "20px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          boxShadow: "0 1px 3px rgba(15, 23, 42, 0.12)",
        }}
      >
        <Text style={{ ...label, color: "#586679" }}>Task breakdown</Text>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            data-testid="sprint-donut"
            style={{ position: "relative", width: size, height: size, flexShrink: 0 }}
          >
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              role="img"
              aria-label="Current sprint task breakdown"
            >
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={MISTY}
                strokeWidth={stroke}
              />
              {donutTotal > 0
                ? donutSegments.map((seg) => {
                    if (seg.value === 0) return null;
                    const dash = (seg.value / donutTotal) * circumference;
                    const dashOffset = -offset;
                    offset += dash;
                    return (
                      <circle
                        key={seg.label}
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke={seg.color}
                        strokeWidth={stroke}
                        strokeDasharray={`${dash} ${circumference - dash}`}
                        strokeDashoffset={dashOffset}
                        transform={`rotate(-90 ${size / 2} ${size / 2})`}
                      />
                    );
                  })
                : null}
            </svg>
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              <Text fw={700} style={{ fontSize: "2rem", lineHeight: 1.1, color: NAVY }}>
                {donutTotal}
              </Text>
              <Text style={{ fontSize: "0.6875rem", color: BLUE }}>Total Tasks</Text>
            </div>
          </div>

          <Stack gap={8} style={{ flex: 1, minWidth: 0 }}>
            {rows.map((row) => (
              <div
                key={row.key}
                data-testid={`kpi-tile-${row.key}`}
                style={{ ...tile, background: row.bg, color: row.fg }}
              >
                <Group gap={8} align="center">
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: row.fg,
                      display: "inline-block",
                    }}
                  />
                  <Text size="xs" fw={600} style={{ color: row.fg }}>
                    {row.label}
                  </Text>
                </Group>
                <Text size="sm" fw={700} style={{ color: row.fg }}>
                  {row.value}
                </Text>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8 }}>
              <div
                data-testid="kpi-tile-delayed"
                style={{
                  ...tile,
                  flex: 1,
                  background: "#FBE6E9",
                  color: RED,
                  border: `1px solid ${RED}`,
                }}
              >
                <Text size="xs" fw={600} style={{ color: "inherit" }}>
                  Delayed
                </Text>
                <Text size="sm" fw={700} style={{ color: "inherit" }}>
                  {delayed}
                </Text>
              </div>
              <div
                data-testid="kpi-tile-on-time"
                style={{ ...tile, flex: 1, background: GREEN, color: "#FFFFFF" }}
              >
                <Text size="xs" fw={600} style={{ color: "inherit" }}>
                  On Time
                </Text>
                <Text size="sm" fw={700} style={{ color: "inherit" }}>
                  {sprintSummary.onTime}
                </Text>
              </div>
            </div>
          </Stack>
        </div>
      </div>
    </div>
  );
});

export function HomePage() {
  const user = useAuth();
  const isPm = useIsPm();
  const [params, setParams] = useSearchParams();
  const filters = parseHomeFilters(params);
  // The group-by toggle is remembered per user in localStorage; the URL overrides it for shared links.
  const [rememberedGroup, setRememberedGroup] = useLocalStorage({
    key: `home.group.${user.id}`,
    defaultValue: false,
  });
  const grouped = filters.group ?? rememberedGroup;

  const { project } = useCurrentProject();
  const subs = useSubprojects(project?.id);
  const users = useUsers();
  const [view, setView] = useLocalStorage<WorkView>({
    key: `home.view.${user.id}`,
    defaultValue: "list",
  });
  const projects = useProjects();
  const projectNames = useMemo(
    () => new Map((projects.data ?? []).map((p) => [p.id, p.name])),
    [projects.data],
  );
  const query = useHome({ assigneeId: filters.assigneeId, subprojectId: filters.subprojectId });
  const homeData = query.data;

  const sorted = useMemo(
    () =>
      homeData
        ? {
            thisWeek: sortTasksOngoingFirst(homeData.thisWeek),
            nextWeek: sortTasksOngoingFirst(homeData.nextWeek),
            thisMonth: sortTasksOngoingFirst(homeData.thisMonth),
            later: sortTasksOngoingFirst(homeData.later),
            modThisWeek: sortTasksOngoingFirst(homeData.moduleItems.thisWeek),
            modNextWeek: sortTasksOngoingFirst(homeData.moduleItems.nextWeek),
            modThisMonth: sortTasksOngoingFirst(homeData.moduleItems.thisMonth),
            modLater: sortTasksOngoingFirst(homeData.moduleItems.later),
          }
        : null,
    [homeData],
  );

  const update = (next: typeof filters) =>
    setParams(applyHomeFilters(params, next), { replace: true });

  return (
    <>
      <PageHeader
        title="Home"
        subtitle={isPm ? "Everyone's work, by when it is due" : "Your work, by when it is due"}
      />
      <QueryState query={query}>
        {(data) => (
          <Stack>
            <Header data={data} />
            {isPm ? (
              <Group align="flex-end" wrap="wrap">
                <Select
                  label="Assignee"
                  placeholder="Everyone"
                  clearable
                  searchable
                  value={filters.assigneeId ?? null}
                  onChange={(v) => update({ ...filters, assigneeId: v ?? undefined })}
                  data={(users.data ?? [])
                    .filter((u) => u.isActive)
                    .map((u) => ({ value: u.id, label: u.fullName }))}
                />
                <Select
                  label="Scope"
                  allowDeselect={false}
                  value={filters.assigneeId === user.id ? "mine" : "team"}
                  onChange={(v) =>
                    update({ ...filters, assigneeId: v === "mine" ? user.id : undefined })
                  }
                  data={[
                    { value: "team", label: "Whole team" },
                    { value: "mine", label: "Only me" },
                  ]}
                />
                <Select
                  label="Subproject"
                  placeholder="All subprojects"
                  clearable
                  searchable
                  value={filters.subprojectId ?? null}
                  onChange={(v) => update({ ...filters, subprojectId: v ?? undefined })}
                  data={(subs.data ?? []).map((s) => ({
                    value: s.id,
                    label: s.name,
                  }))}
                />
                <Switch
                  label="Group by subproject"
                  checked={grouped}
                  onChange={(e) => {
                    setRememberedGroup(e.currentTarget.checked);
                    update({ ...filters, group: e.currentTarget.checked });
                  }}
                />
              </Group>
            ) : null}
            <Group justify="flex-end">
              <WorkViewSwitch value={view} onChange={setView} />
            </Group>
            {data.truncated ? (
              <Alert color="sun" title="Showing part of a long list">
                There is more work than fits on this page. Filter by assignee or subproject to see
                the rest.
              </Alert>
            ) : null}
            <Section
              title="Current Sprint"
              rows={sorted?.thisWeek ?? []}
              moduleRows={sorted?.modThisWeek ?? []}
              grouped={grouped}
              view={view}
              projectNames={projectNames}
            />
            <Section
              title="Next Sprint"
              rows={sorted?.nextWeek ?? []}
              moduleRows={sorted?.modNextWeek ?? []}
              grouped={grouped}
              view={view}
              projectNames={projectNames}
            />
            <Section
              title="Upcoming Sprints"
              rows={sorted?.thisMonth ?? []}
              moduleRows={sorted?.modThisMonth ?? []}
              grouped={grouped}
              view={view}
              projectNames={projectNames}
              extra={
                data.upcomingReleases.length > 0 ? (
                  <Stack gap={4} p="sm" style={{ borderBottom: "var(--outline-thin)" }}>
                    <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                      Upcoming releases
                    </Text>
                    {data.upcomingReleases.map((r) => (
                      <Group key={r.id} gap="xs">
                        <Badge color="sea" variant="light">
                          Release
                        </Badge>
                        <Text size="sm" fw={600}>
                          {r.name}
                        </Text>
                        <Text size="sm" c="dimmed">
                          {fmtDate(r.targetDate)}
                        </Text>
                      </Group>
                    ))}
                  </Stack>
                ) : undefined
              }
            />
            <Text size="xs" c="dimmed">
              Weeks start on Monday ({data.timezone}). Items with no due date are not shown here.
            </Text>
          </Stack>
        )}
      </QueryState>
    </>
  );
}
