import { Alert, Badge, Button, Center, Loader, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import type { UseQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  ENUM_LABELS,
  type ActivityPriority,
  type ActivityStatus,
  type Health,
  type SprintStatus,
  type WorkType,
} from "@myapp/shared";
import { errorMessage } from "../api/client";
import { HEALTH_COLOR, PRIORITY_COLOR, SPRINT_COLOR, STATUS_COLOR } from "../theme";

/** Every screen shows loading, error and empty states through this wrapper. */
export function QueryState<T>({
  query,
  isEmpty,
  empty,
  children,
}: {
  query: Pick<UseQueryResult<T>, "isPending" | "isError" | "error" | "data" | "refetch">;
  isEmpty?: (data: T) => boolean;
  empty?: ReactNode;
  children: (data: T) => ReactNode;
}) {
  if (query.isPending) {
    return (
      <Center py="xl" aria-busy="true">
        <Loader size="sm" />
      </Center>
    );
  }
  if (query.isError) {
    return (
      <Alert color="coral" title="Could not load this">
        <Stack gap="xs" align="flex-start">
          <Text size="sm">{errorMessage(query.error)}</Text>
          <Button size="xs" variant="light" onClick={() => void query.refetch()}>
            Try again
          </Button>
        </Stack>
      </Alert>
    );
  }
  if (query.data === undefined) return null;
  if (isEmpty?.(query.data)) {
    return (
      <Center py="xl">
        <Text c="dimmed">{empty ?? "Nothing here yet."}</Text>
      </Center>
    );
  }
  return <>{children(query.data)}</>;
}

export const StatusBadge = ({ status }: { status: ActivityStatus }) => (
  <Badge color={STATUS_COLOR[status]} variant="light">
    {ENUM_LABELS.status[status]}
  </Badge>
);
export const PriorityBadge = ({ priority }: { priority: ActivityPriority }) => (
  <Badge color={PRIORITY_COLOR[priority]} variant="outline">
    {ENUM_LABELS.priority[priority]}
  </Badge>
);
export const WorkTypeBadge = ({ type }: { type: WorkType }) => (
  <Badge color="navy" variant="outline">
    {ENUM_LABELS.workType[type]}
  </Badge>
);
export const HealthBadge = ({ health }: { health: Health }) => (
  <Badge color={HEALTH_COLOR[health]} variant="light">
    {ENUM_LABELS.health[health]}
  </Badge>
);
export const SprintBadge = ({ status }: { status: SprintStatus }) => (
  <Badge color={SPRINT_COLOR[status]} variant="light">
    {ENUM_LABELS.sprintStatus[status]}
  </Badge>
);

export const fmtDate = (d: string | null | undefined): string => {
  if (!d) return "No date";
  const [y, m, day] = d.slice(0, 10).split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString(undefined, {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};
export const fmtDateTime = (iso: string): string =>
  new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

export const toast = {
  error: (message: string, title = "That did not work") =>
    notifications.show({ color: "coral", title, message, autoClose: 8000 }),
  ok: (message: string) => notifications.show({ color: "sea", message, autoClose: 3000 }),
  warn: (message: string, title = "Heads up") =>
    notifications.show({ color: "sun", title, message, autoClose: 8000 }),
};

import { AnimeHero, type HeaderVariant } from "./AnimeHero";

export function PageHeader({
  title,
  actions,
  subtitle,
  variant = "home",
  tag,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  variant?: HeaderVariant;
  tag?: string;
}) {
  return (
    <div className="lp-hero-wrap">
      <AnimeHero
        title={title}
        subtitle={subtitle}
        variant={variant}
        tag={tag}
        rightSlot={actions}
      />
    </div>
  );
}
