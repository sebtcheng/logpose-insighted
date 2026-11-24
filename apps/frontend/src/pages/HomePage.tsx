import { memo, useMemo, useState } from "react";
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
import { PaginationBar, paginateItems } from "../components/PaginationBar";
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
  const [modulePage, setModulePage] = useState(1);
  const isNextWeek = title === "Next Sprint";
  const risky = isNextWeek ? rows.filter((r) => r.atRisk) : [];
  const pagedModules = paginateItems(moduleRows, modulePage);
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
          <div style={{ maxHeight: 420, overflowY: "auto" }}>
            <WorkItemsView
              items={pagedModules.items}
              view={view}
              projectNames={projectNames}
              checkable
            />
          </div>
          {pagedModules.total > 20 ? (
            <div style={{ padding: "0 16px 12px" }}>
              <PaginationBar
                page={pagedModules.page}
                total={pagedModules.total}
                onPageChange={setModulePage}
              />
            </div>
          ) : null}
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

const LABEL_FONT = "Inter, system-ui, sans-serif";

export function getSprintProgressColor(percentage: number): {
  hue: number;
  color: string;
  border: string;
  background: string;
} {
  const safe = Number.isFinite(percentage) ? percentage : 0;
  const clamped = Math.min(100, Math.max(0, safe));
  const hue = Math.round((clamped / 100) * 120);
  return {
    hue,
    color: `hsl(${hue}, 85%, 62%)`,
    border: `1px solid hsla(${hue}, 85%, 58%, 0.48)`,
    background: `hsla(${hue}, 85%, 52%, 0.14)`,
  };
}

export const Header = memo(function Header({ data }: { data: HomeResponse }) {
  const { sprintSummary, activeSprint, carryOver } = data;
  const backlogCount = carryOver?.count ?? 0;
  const combinedTotal = sprintSummary.total + backlogCount;
  const rawCompletedPct =
    activeSprint && combinedTotal > 0 ? (sprintSummary.completed / combinedTotal) * 100 : 0;
  const pct = Math.min(100, Math.max(0, Math.round(rawCompletedPct * 10) / 10));
  const rawBacklogPct =
    activeSprint && combinedTotal > 0 && backlogCount > 0 ? (backlogCount / combinedTotal) * 100 : 0;
  const backlogPct = Math.min(100 - pct, Math.max(0, Math.round(rawBacklogPct * 10) / 10));
  const remaining = Math.max(0, sprintSummary.total - sprintSummary.completed);
  const pctBadgeStyle = getSprintProgressColor(pct);

  // The donut shows open versus finished work; Delayed and On Time are schedule views over the same tasks.
  const donutSegments = [
    { label: "Completed", value: sprintSummary.completed, color: "#34C98B" },
    { label: "Ongoing", value: sprintSummary.ongoing, color: "#6EA8FF" },
  ];
  const donutTotal = donutSegments.reduce((acc, s) => acc + s.value, 0);
  const completedSharePct =
    donutTotal > 0 ? Math.round((sprintSummary.completed / donutTotal) * 1000) / 10 : 0;
  const ongoingSharePct =
    donutTotal > 0 ? Math.round((sprintSummary.ongoing / donutTotal) * 1000) / 10 : 0;
  const size = 148;
  const stroke = 18;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  const delayed = sprintSummary.delayed;
  const label: React.CSSProperties = {
    fontFamily: LABEL_FONT,
    fontSize: "0.6875rem",
    fontWeight: 600,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  };

  return (
    <div
      data-testid="sprint-telemetry-card"
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
        gap: 16,
        marginBottom: "var(--mantine-spacing-lg)",
        fontFamily: LABEL_FONT,
      }}
    >
      <div
        data-testid="sprint-hero-panel"
        style={{
          background: "#0B2D5E",
          color: "#FFFFFF",
          borderTop: "3px solid #E5484D",
          borderRadius: 10,
          padding: "20px 24px 18px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: 20,
        }}
      >
        <Group justify="space-between" align="flex-start" wrap="nowrap" gap="md">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Group gap={10} align="center" wrap="wrap">
              <Text style={{ ...label, color: "#B9C8E0", fontSize: "0.75rem" }}>
                Current sprint
              </Text>
              {activeSprint ? (
                <Text
                  data-testid="sprint-days-left"
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    color: "#F5C242",
                    background: "rgba(245, 194, 66, 0.14)",
                    border: "1px solid rgba(245, 194, 66, 0.38)",
                    borderRadius: 999,
                    padding: "2px 10px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {activeSprint.daysLeft} day{activeSprint.daysLeft === 1 ? "" : "s"} left · Ends{" "}
                  {fmtDate(activeSprint.endDate)}
                </Text>
              ) : null}
            </Group>
            <Title
              order={2}
              style={{
                color: "#FFFFFF",
                fontFamily: "'Source Serif 4', Georgia, serif",
                fontSize: "3.5rem",
                fontWeight: 700,
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
              }}
            >
              {activeSprint ? activeSprint.name : "No active sprint"}
            </Title>
          </div>

          <div
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.14)",
              borderRadius: 12,
              padding: "14px 18px",
              minWidth: 168,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              flexShrink: 0,
            }}
          >
            <Group justify="space-between" align="center" gap="xs">
              <Text style={{ ...label, color: "#B9C8E0", fontSize: "0.75rem" }}>Complete</Text>
              <span
                aria-hidden="true"
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 999,
                  border: `1.5px solid ${pctBadgeStyle.color}`,
                  color: pctBadgeStyle.color,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.625rem",
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                ✓
              </span>
            </Group>
            <div
              data-testid="sprint-progress-pct"
              style={{
                color: pctBadgeStyle.color,
                fontSize: "2.75rem",
                fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1,
                whiteSpace: "nowrap",
              }}
            >
              {pct}%
            </div>
            <div
              style={{
                height: 4,
                background: "#3A5885",
                borderRadius: 999,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: "#F5C242",
                  borderRadius: 999,
                }}
              />
            </div>
            <Text size="xs" style={{ color: "#B9C8E0", whiteSpace: "nowrap" }}>
              {activeSprint
                ? `${sprintSummary.completed} of ${combinedTotal} tasks done`
                : "No active sprint"}
            </Text>
          </div>
        </Group>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Text style={{ ...label, color: "#B9C8E0", fontSize: "0.75rem" }}>
            Current sprint progress
          </Text>
          <Group justify="space-between" align="baseline">
            <Text
              fw={700}
              data-testid="sprint-progress-summary"
              style={{ color: "#FFFFFF", fontSize: "1.125rem", lineHeight: 1.2 }}
            >
              {activeSprint
                ? `${sprintSummary.completed} of ${combinedTotal} tasks completed`
                : "No active sprint"}
            </Text>
            {activeSprint && backlogCount > 0 ? (
              <Text
                size="xs"
                fw={600}
                data-testid="sprint-progress-backlog-label"
                style={{ color: "#FF9EA3", whiteSpace: "nowrap" }}
              >
                {backlogCount} {backlogCount === 1 ? "backlog" : "backlogs"}
              </Text>
            ) : null}
          </Group>
          <div
            role="progressbar"
            aria-label="Current sprint completion"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            style={{
              height: 10,
              background: "#3A5885",
              borderRadius: 999,
              overflow: "hidden",
              display: "flex",
              alignItems: "stretch",
            }}
          >
            <div
              data-testid="sprint-progress-completed-bar"
              style={{
                width: `${pct}%`,
                height: "100%",
                background: "#F5C242",
                transition: "width 160ms cubic-bezier(0.2, 0, 0, 1)",
              }}
            />
            {backlogCount > 0 ? (
              <div
                data-testid="sprint-progress-backlog-bar"
                style={{
                  width: `${backlogPct}%`,
                  height: "100%",
                  marginLeft: "auto",
                  background: "#E5484D",
                  transition: "width 160ms cubic-bezier(0.2, 0, 0, 1)",
                }}
              />
            ) : null}
          </div>
          <Group gap={18} mt={4}>
            <Group gap={6} align="center">
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: "#F5C242",
                  display: "inline-block",
                }}
              />
              <Text size="xs" style={{ color: "#B9C8E0" }}>
                Completed <strong style={{ color: "#FFFFFF" }}>{sprintSummary.completed}</strong>
              </Text>
            </Group>
            <Group gap={6} align="center">
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: "#3A5885",
                  display: "inline-block",
                }}
              />
              <Text size="xs" style={{ color: "#B9C8E0" }}>
                Remaining <strong style={{ color: "#FFFFFF" }}>{remaining}</strong>
              </Text>
            </Group>
            <Group gap={6} align="center">
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: "#E5484D",
                  display: "inline-block",
                }}
              />
              <Text size="xs" style={{ color: "#B9C8E0" }}>
                Backlog <strong style={{ color: "#FFFFFF" }}>{backlogCount}</strong>
              </Text>
            </Group>
          </Group>
        </div>
      </div>

      <div
        data-testid="task-breakdown-panel"
        style={{
          background: "#0B2D5E",
          borderTop: "3px solid #F5C242",
          borderRadius: 10,
          overflow: "hidden",
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          boxShadow: "0 1px 3px rgba(15, 23, 42, 0.12)",
        }}
      >
        <div
          style={{
            background: "#071F45",
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <Text style={{ ...label, color: "#F5C242", alignSelf: "flex-start", fontSize: "0.75rem" }}>
            Task breakdown
          </Text>
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
            }}
          >
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
                stroke="rgba(255, 255, 255, 0.1)"
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
              <Text
                fw={700}
                style={{
                  fontFamily: "'Source Serif 4', Georgia, serif",
                  fontSize: "2.75rem",
                  lineHeight: 1,
                  color: "#FFFFFF",
                }}
              >
                {donutTotal}
              </Text>
              <Text style={{ ...label, fontSize: "0.625rem", color: "#B9C8E0", marginTop: 4 }}>
                Total tasks
              </Text>
            </div>
          </div>
          </div>
        </div>

        <div
          style={{
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 14,
            minWidth: 0,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Group justify="space-between" align="center">
              <Text style={{ ...label, color: "#B9C8E0", fontSize: "0.75rem" }}>
                Completed {completedSharePct}%
              </Text>
              <Text style={{ ...label, color: "#B9C8E0", fontSize: "0.75rem" }}>
                Ongoing {ongoingSharePct}%
              </Text>
            </Group>
            <div
              style={{
                height: 10,
                background: "rgba(255, 255, 255, 0.1)",
                borderRadius: 999,
                overflow: "hidden",
                display: "flex",
              }}
            >
              <div
                style={{
                  width: `${completedSharePct}%`,
                  height: "100%",
                  background: "#34C98B",
                }}
              />
              <div
                style={{
                  width: `${ongoingSharePct}%`,
                  height: "100%",
                  background: "#6EA8FF",
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <div
              data-testid="kpi-tile-completed"
              style={{
                background: "rgba(52, 201, 139, 0.12)",
                border: "1px solid rgba(52, 201, 139, 0.35)",
                borderRadius: 10,
                padding: "12px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <Group gap={6} align="center">
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: "#34C98B",
                    display: "inline-block",
                  }}
                />
                <Text size="sm" fw={600} style={{ color: "#34C98B" }}>
                  Completed
                </Text>
              </Group>
              <Text
                fw={800}
                style={{
                  color: "#FFFFFF",
                  fontSize: "2.25rem",
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {sprintSummary.completed}
              </Text>
            </div>

            <div
              data-testid="kpi-tile-ongoing"
              style={{
                background: "rgba(110, 168, 255, 0.12)",
                border: "1px solid rgba(110, 168, 255, 0.35)",
                borderRadius: 10,
                padding: "12px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <Group gap={6} align="center">
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: "#6EA8FF",
                    display: "inline-block",
                  }}
                />
                <Text size="sm" fw={600} style={{ color: "#B9C8E0" }}>
                  Ongoing
                </Text>
              </Group>
              <Text
                fw={800}
                style={{
                  color: "#FFFFFF",
                  fontSize: "2.25rem",
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {sprintSummary.ongoing}
              </Text>
            </div>

            <div
              data-testid="kpi-tile-delayed"
              style={{
                background: "rgba(255, 158, 163, 0.08)",
                border: "1px solid rgba(255, 158, 163, 0.3)",
                borderRadius: 10,
                padding: "12px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <Group gap={6} align="center">
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: "#FF9EA3",
                    display: "inline-block",
                  }}
                />
                <Text size="sm" fw={600} style={{ color: "#FF9EA3" }}>
                  Delayed
                </Text>
              </Group>
              <Text
                fw={800}
                style={{
                  color: "#FF9EA3",
                  fontSize: "2.25rem",
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {delayed}
              </Text>
            </div>

            <div
              data-testid="kpi-tile-on-time"
              style={{
                background: "#34C98B",
                borderRadius: 10,
                padding: "12px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 6,
                color: "#06231A",
              }}
            >
              <Text size="sm" fw={700} style={{ color: "#06231A" }}>
                ✓ On time
              </Text>
              <Text
                fw={800}
                style={{
                  color: "#06231A",
                  fontSize: "2.25rem",
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {sprintSummary.onTime}
              </Text>
            </div>
          </div>
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
        variant="home"
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
