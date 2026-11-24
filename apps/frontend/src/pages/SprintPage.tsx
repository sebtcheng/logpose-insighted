import {
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  Group,
  NumberInput,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ENUM_LABELS, SPRINT_STATUSES, type SprintDto } from "@myapp/shared";
import {
  useActivities,
  useActivity,
  useCapacity,
  useScopeChanges,
  useSearch,
  useSetCapacity,
  useSprints,
  useUpdateSprint,
  useUsers,
} from "../api/hooks";
import { useIsPm } from "../auth";
import { ActivityRow, useOpenActivity } from "../components/ActivityRow";
import { GovernancePanels } from "../components/ActivityDrawer";
import { PageHeader, QueryState, SprintBadge, fmtDate, fmtDateTime, toast } from "../components/ui";
import { useGovernedUpdate } from "../components/useGovernedUpdate";

export function SprintPage() {
  const { projectId, sprintId } = useParams();
  const sprints = useSprints(projectId);
  const sprint = sprints.data?.find((s) => s.id === sprintId);
  return (
    <QueryState query={sprints}>
      {() =>
        !sprint || !projectId ? (
          <Alert color="coral" title="Sprint not found">
            <Anchor component={Link} to="/projects">
              Back to projects
            </Anchor>
          </Alert>
        ) : (
          <SprintView sprint={sprint} projectId={projectId} />
        )
      }
    </QueryState>
  );
}

function SprintView({ sprint, projectId }: { sprint: SprintDto; projectId: string }) {
  const isPm = useIsPm();
  const items = useActivities(projectId, { sprintId: sprint.id });
  const readOnlyAdd = sprint.status === "completed";
  return (
    <>
      <PageHeader
        variant="history"
        title={sprint.name}
        subtitle={
          <>
            <Anchor component={Link} to={`/projects/${projectId}?tab=sprints`}>
              All sprints
            </Anchor>{" "}
            · {fmtDate(sprint.startDate)} to {fmtDate(sprint.endDate)}
          </>
        }
        actions={<SprintBadge status={sprint.status} />}
      />
      <Stack gap="lg">
        {isPm ? (
          <SprintSettings
            key={`${sprint.goal}|${sprint.status}|${sprint.startDate}|${sprint.endDate}`}
            sprint={sprint}
          />
        ) : (
          <GoalCard sprint={sprint} />
        )}
        <CapacityCard sprint={sprint} canEdit={isPm} />
        <Stack gap="xs">
          <Group justify="space-between">
            <Title order={4}>Activities in this sprint</Title>
          </Group>
          {isPm && !readOnlyAdd ? <AddToSprint sprint={sprint} /> : null}
          <QueryState
            query={items}
            isEmpty={(d) => d.pages.every((p) => p.items.length === 0)}
            empty="No activities in this sprint yet."
          >
            {(data) => (
              <Card withBorder padding={0}>
                {data.pages
                  .flatMap((p) => p.items)
                  .map((a) => (
                    <ActivityRow key={a.id} activity={a} />
                  ))}
                {items.hasNextPage ? (
                  <Group justify="center" p="sm">
                    <Button
                      variant="light"
                      loading={items.isFetchingNextPage}
                      onClick={() => void items.fetchNextPage()}
                    >
                      Load more
                    </Button>
                  </Group>
                ) : null}
              </Card>
            )}
          </QueryState>
        </Stack>
        <ScopeChangeLog sprintId={sprint.id} />
      </Stack>
    </>
  );
}

function GoalCard({ sprint }: { sprint: SprintDto }) {
  return (
    <Card withBorder>
      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
        Sprint goal
      </Text>
      <Text fw={600}>{sprint.goal ?? "No goal set"}</Text>
    </Card>
  );
}

function SprintSettings({ sprint }: { sprint: SprintDto }) {
  const update = useUpdateSprint();
  const [goal, setGoal] = useState(sprint.goal ?? "");
  const [status, setStatus] = useState(sprint.status);
  const [start, setStart] = useState(sprint.startDate);
  const [end, setEnd] = useState(sprint.endDate);
  return (
    <Card withBorder>
      <Stack>
        <Textarea
          label="Sprint goal"
          description="A sprint cannot become active without a goal"
          autosize
          minRows={2}
          value={goal}
          onChange={(e) => setGoal(e.currentTarget.value)}
        />
        <Group grow align="flex-start">
          <Select
            label="Status"
            allowDeselect={false}
            value={status}
            onChange={(v) => v && setStatus(v as SprintDto["status"])}
            data={SPRINT_STATUSES.map((s) => ({ value: s, label: ENUM_LABELS.sprintStatus[s] }))}
          />
          <TextInput
            label="Start"
            type="date"
            value={start}
            onChange={(e) => setStart(e.currentTarget.value)}
          />
          <TextInput
            label="End"
            type="date"
            value={end}
            onChange={(e) => setEnd(e.currentTarget.value)}
          />
        </Group>
        <Button
          w="fit-content"
          loading={update.isPending}
          onClick={() =>
            update.mutate(
              {
                id: sprint.id,
                patch: { goal: goal.trim() || null, status, startDate: start, endDate: end },
              },
              { onSuccess: () => toast.ok("Sprint saved"), onError: (e) => toast.error(e.message) },
            )
          }
        >
          Save sprint
        </Button>
      </Stack>
    </Card>
  );
}

function CapacityCard({ sprint, canEdit }: { sprint: SprintDto; canEdit: boolean }) {
  const cap = useCapacity(sprint.id);
  const save = useSetCapacity(sprint.id);
  const [draft, setDraft] = useState<Record<string, number | string>>({});
  return (
    <Card withBorder>
      <Title order={4} mb="xs">
        Team capacity
      </Title>
      <QueryState query={cap} isEmpty={(d) => d.members.length === 0} empty="No active people.">
        {(data) => (
          <Stack>
            <Text size="sm" c="dimmed">
              Assigned items are open activities in this sprint. Capacity is items per person.
              {data.teamCapacityItems !== null ? ` Team capacity: ${data.teamCapacityItems}.` : ""}
            </Text>
            <Table.ScrollContainer minWidth={420}>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Person</Table.Th>
                    <Table.Th>Assigned</Table.Th>
                    <Table.Th>Capacity</Table.Th>
                    <Table.Th />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {data.members.map((m) => (
                    <Table.Tr key={m.userId}>
                      <Table.Td>{m.fullName}</Table.Td>
                      <Table.Td>{m.assignedItems}</Table.Td>
                      <Table.Td>
                        {canEdit ? (
                          <NumberInput
                            aria-label={`Capacity for ${m.fullName}`}
                            size="xs"
                            w={90}
                            min={0}
                            value={draft[m.userId] ?? m.capacityItems ?? ""}
                            onChange={(v) => setDraft((d) => ({ ...d, [m.userId]: v }))}
                          />
                        ) : (
                          (m.capacityItems ?? "Not set")
                        )}
                      </Table.Td>
                      <Table.Td>
                        {m.overCapacity ? <Badge color="coral">Over capacity</Badge> : null}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
            {canEdit ? (
              <Button
                w="fit-content"
                loading={save.isPending}
                onClick={() =>
                  save.mutate(
                    data.members
                      .map((m) => ({
                        userId: m.userId,
                        value: draft[m.userId] ?? m.capacityItems ?? "",
                      }))
                      .filter((m) => m.value !== "" && Number.isFinite(Number(m.value)))
                      .map((m) => ({ userId: m.userId, capacityItems: Number(m.value) })),
                    {
                      onSuccess: () => toast.ok("Capacity saved"),
                      onError: (e) => toast.error(e.message),
                    },
                  )
                }
              >
                Save capacity
              </Button>
            ) : null}
          </Stack>
        )}
      </QueryState>
    </Card>
  );
}

/** PM adds an existing activity to this sprint; an active sprint opens the one-in-one-out dialog. */
function AddToSprint({ sprint }: { sprint: SprintDto }) {
  const [text, setText] = useState("");
  const [debounced] = useDebouncedValue(text, 250);
  const [picked, setPicked] = useState<string | null>(null);
  const search = useSearch(debounced);
  const options = (search.data?.activities ?? []).map((a) => ({
    value: a.id,
    label: `${a.subprojectCode ? `${a.subprojectCode} · ` : ""}${a.title}`,
  }));
  return (
    <Stack gap="xs">
      <Select
        label="Add an activity to this sprint"
        placeholder="Search by title"
        searchable
        data={options}
        searchValue={text}
        onSearchChange={setText}
        value={picked}
        onChange={setPicked}
        filter={({ options: o }) => o}
        nothingFoundMessage={debounced.length < 3 ? "Type at least 3 characters" : "No matches"}
      />
      {picked ? (
        <AddRunner
          key={picked}
          id={picked}
          sprint={sprint}
          onDone={() => {
            setPicked(null);
            setText("");
          }}
        />
      ) : null}
    </Stack>
  );
}

function AddRunner({ id, sprint, onDone }: { id: string; sprint: SprintDto; onDone: () => void }) {
  const q = useActivity(id);
  const gov = useGovernedUpdate(id);
  return (
    <QueryState query={q}>
      {({ activity }) => (
        <Group>
          <GovernancePanels activity={activity} gov={gov} />
          <Text size="sm">{activity.title}</Text>
          <Button
            size="xs"
            loading={gov.isPending}
            onClick={() =>
              void gov.run({ sprintId: sprint.id }).then((r) => {
                if (r) {
                  toast.ok("Added to sprint");
                  onDone();
                }
              })
            }
          >
            Add to {sprint.name}
          </Button>
          <Button size="xs" variant="default" onClick={onDone}>
            Cancel
          </Button>
        </Group>
      )}
    </QueryState>
  );
}

function TitleOf({ id }: { id: string | null }) {
  const q = useActivity(id);
  const open = useOpenActivity();
  if (!id)
    return (
      <Text size="sm" c="dimmed">
        None
      </Text>
    );
  const title = q.data?.activity.title;
  return (
    <Anchor component="button" type="button" size="sm" onClick={() => open(id)}>
      {title ?? "Activity"}
    </Anchor>
  );
}

function ScopeChangeLog({ sprintId }: { sprintId: string }) {
  const q = useScopeChanges(sprintId);
  const users = useUsers();
  const who = (id: string | null) => users.data?.find((u) => u.id === id)?.fullName ?? "Someone";
  return (
    <Stack gap="xs">
      <Title order={4}>Scope changes</Title>
      <QueryState
        query={q}
        isEmpty={(d) => d.length === 0}
        empty="No scope changes in this sprint."
      >
        {(items) => (
          <Table.ScrollContainer minWidth={560}>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>When</Table.Th>
                  <Table.Th>Added</Table.Th>
                  <Table.Th>Removed</Table.Th>
                  <Table.Th>Reason</Table.Th>
                  <Table.Th>By</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {items.map((c) => (
                  <Table.Tr key={c.id}>
                    <Table.Td>{fmtDateTime(c.createdAt)}</Table.Td>
                    <Table.Td>
                      <TitleOf id={c.addedActivityId} />
                    </Table.Td>
                    <Table.Td>
                      <TitleOf id={c.removedActivityId} />
                    </Table.Td>
                    <Table.Td>{c.reason}</Table.Td>
                    <Table.Td>{who(c.requestedById)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </QueryState>
    </Stack>
  );
}
