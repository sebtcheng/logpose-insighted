import {
  Badge,
  Button,
  Card,
  Checkbox,
  Group,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Textarea,
  UnstyledButton,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ENUM_LABELS,
  RAID_STATUSES,
  RAID_TYPES,
  type RaidItemDto,
  type RaidStatus,
  type RaidType,
} from "@myapp/shared";
import {
  useCreateRaid,
  useCurrentProject,
  useDeleteRaid,
  useRaid,
  useProjects,
  useUpdateRaid,
  useUsers,
} from "../api/hooks";
import { useIsPm } from "../auth";
import { PageHeader, QueryState, toast } from "../components/ui";
import {
  MitigatingActionsField,
  MitigationChecklist,
  type MitigatingActionDraft,
} from "../components/MitigatingActions";
import { sprintDraftValue } from "../components/SprintSelect";
import { SideModal } from "../components/SideModal";
import { ViewModeToggle } from "../components/ViewModeToggle";
import { mitigationPercent } from "../lib/raidMitigation";
import { useViewMode } from "../lib/viewMode";

const LEVELS = [
  { value: "1", label: "Low" },
  { value: "2", label: "Medium" },
  { value: "3", label: "High" },
];
const TYPE_OPTIONS = RAID_TYPES.map((t) => ({ value: t, label: ENUM_LABELS.raidType[t] }));
const STATUS_OPTIONS = RAID_STATUSES.map((s) => ({ value: s, label: ENUM_LABELS.raidStatus[s] }));

const STATUS_COLOR: Record<RaidStatus, string> = {
  open: "red",
  in_progress: "blue",
  mitigated: "teal",
  closed: "gray",
};
const level = (n: number | null) => (n ? ENUM_LABELS.level[n as 1 | 2 | 3] : "Not set");

const SELECT_UI = {
  classNames: { input: "raid-input", option: "raid-option" },
  comboboxProps: {
    transitionProps: { duration: 120, timingFunction: "cubic-bezier(0.2, 0, 0, 1)" },
  },
} as const;

type FormValues = {
  itemType: RaidType;
  description: string;
  impact: string;
  likelihood: string;
  mitigatingActions: MitigatingActionDraft[];
  ownerId: string;
  projectId: string;
};

function RaidForm({
  projectId,
  existing,
  isPm,
  onDone,
  onSaved,
}: {
  projectId: string;
  existing?: RaidItemDto;
  isPm: boolean;
  onDone: () => void;
  /** Called with the project the item now belongs to, so the log can switch to it. */
  onSaved?: (projectId: string) => void;
}) {
  const projects = useProjects();
  const users = useUsers();
  const create = useCreateRaid(projectId);
  const update = useUpdateRaid();
  const form = useForm<FormValues>({
    initialValues: {
      itemType: existing?.itemType ?? "risk",
      description: existing?.description ?? "",
      impact: String(existing?.impact ?? 2),
      likelihood: existing?.likelihood ? String(existing.likelihood) : "",
      mitigatingActions: (existing?.mitigatingActions ?? []).map((a) => ({
        id: a.id,
        description: a.description,
        isCompleted: a.isCompleted,
        sprintKey: sprintDraftValue(a.sprintKey, a.targetDate),
        pmApproval: a.pmApproval,
        responsibleId: a.responsibleId ?? "",
      })),
      ownerId: existing?.ownerId ?? "",
      projectId: existing?.projectId ?? projectId,
    },
    validate: {
      description: (v) => (v.trim() ? null : "Describe the item"),
      mitigatingActions: (list) =>
        list.some((a) => a.description.trim() !== "" && (!a.sprintKey || !a.responsibleId))
          ? "Every mitigating action needs a sprint and a staff member responsible"
          : null,
    },
  });
  const pending = create.isPending || update.isPending;
  const submit = form.onSubmit((v) => {
    const payload = {
      itemType: v.itemType,
      description: v.description.trim(),
      impact: Number(v.impact),
      likelihood: v.likelihood ? Number(v.likelihood) : null,
      mitigatingActions: v.mitigatingActions
        .map((a) => ({
          id: a.id,
          description: a.description.trim(),
          isCompleted: a.isCompleted,
          sprintKey: a.sprintKey,
          responsibleId: a.responsibleId,
        }))
        .filter((a) => a.description !== ""),
      ownerId: v.ownerId || null,
      projectId: v.projectId,
    };
    const opts = {
      onSuccess: () => {
        onSaved?.(v.projectId);
        onDone();
      },
      onError: (e: Error) => toast.error(e.message),
    };
    if (existing) update.mutate({ id: existing.id, patch: payload }, opts);
    else create.mutate(payload, opts);
  });
  return (
    <form onSubmit={submit}>
      <Stack>
        <Select
          label="Type"
          data={TYPE_OPTIONS}
          allowDeselect={false}
          {...form.getInputProps("itemType")}
        />
        <Textarea
          label="Description"
          autosize
          minRows={2}
          data-autofocus
          {...form.getInputProps("description")}
        />
        <SimpleGrid cols={2}>
          <Select
            label="Impact"
            data={LEVELS}
            allowDeselect={false}
            {...form.getInputProps("impact")}
          />
          <Select
            label="Likelihood"
            data={LEVELS}
            clearable
            placeholder="Not set"
            {...form.getInputProps("likelihood")}
          />
        </SimpleGrid>
        <Select
          label="Project"
          allowDeselect={false}
          data={(projects.data ?? [])
            .filter((p) => !p.archivedAt || p.id === form.values.projectId)
            .map((p) => ({ value: p.id, label: p.name }))}
          {...form.getInputProps("projectId")}
        />
        <MitigatingActionsField
          value={form.values.mitigatingActions}
          onChange={(next) => form.setFieldValue("mitigatingActions", next)}
          staffOptions={(users.data ?? [])
            .filter(
              (u) =>
                u.isActive || form.values.mitigatingActions.some((a) => a.responsibleId === u.id),
            )
            .map((u) => ({ value: u.id, label: u.fullName }))}
        />
        {isPm ? (
          <Select
            label="Owner"
            clearable
            searchable
            placeholder="Unassigned"
            data={(users.data ?? [])
              .filter((u) => u.isActive || u.id === form.values.ownerId)
              .map((u) => ({ value: u.id, label: u.fullName }))}
            {...form.getInputProps("ownerId")}
          />
        ) : null}
        <Group justify="flex-end" className="side-modal-footer">
          <Button variant="default" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" loading={pending}>
            {existing ? "Save" : "Submit"}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

function RaidStatusControl({ item, editable }: { item: RaidItemDto; editable: boolean }) {
  const update = useUpdateRaid();
  if (!editable) {
    return (
      <Badge
        className="raid-status-badge"
        data-status={item.status}
        color={STATUS_COLOR[item.status]}
        variant="light"
      >
        {ENUM_LABELS.raidStatus[item.status]}
      </Badge>
    );
  }
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Select
        {...SELECT_UI}
        classNames={{ input: "raid-status-input", option: "raid-option" }}
        data-status={item.status}
        size="xs"
        w={130}
        allowDeselect={false}
        aria-label={`Status for ${item.code}`}
        data={STATUS_OPTIONS}
        value={item.status}
        onChange={(v) =>
          v &&
          update.mutate(
            { id: item.id, patch: { status: v as RaidStatus } },
            { onError: (e) => toast.error(e.message) },
          )
        }
      />
    </div>
  );
}

function RaidActions({
  item,
  onEdit,
  canDelete = true,
}: {
  item: RaidItemDto;
  onEdit: (i: RaidItemDto) => void;
  /** Deleting is the PM's. */
  canDelete?: boolean;
}) {
  const remove = useDeleteRaid();
  return (
    <Group gap={8} wrap="nowrap" className="raid-actions" onClick={(e) => e.stopPropagation()}>
      <Button
        size="compact-xs"
        variant="default"
        className="raid-action"
        onClick={(e) => {
          e.stopPropagation();
          onEdit(item);
        }}
      >
        Edit
      </Button>
      {canDelete ? (
        <Button
          size="compact-xs"
          variant="subtle"
          className="raid-action raid-delete"
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(`Delete ${item.code}? This cannot be undone.`)) {
              remove.mutate(item.id, { onError: (err) => toast.error(err.message) });
            }
          }}
        >
          Delete
        </Button>
      ) : null}
    </Group>
  );
}

/** Card summary: completion percentage only. Opens the side modal where the actions are managed. */
export function MitigationSummary({
  item,
  onOpen,
}: {
  item: RaidItemDto;
  onOpen: (i: RaidItemDto) => void;
}) {
  const total = item.mitigatingActions.length;
  const done = item.mitigatingActions.filter((a) => a.isCompleted).length;
  return (
    <UnstyledButton
      type="button"
      className="raid-mitigation-summary"
      style={{ flexShrink: 0 }}
      aria-label={`Mitigation ${mitigationPercent(item.mitigatingActions)} percent, ${done} of ${total} actions done. Open ${item.code}`}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(item);
      }}
    >
      <Badge
        size="lg"
        variant="light"
        className="raid-mono"
        style={{ overflow: "visible", flexShrink: 0 }}
      >
        {mitigationPercent(item.mitigatingActions)}%
      </Badge>
    </UnstyledButton>
  );
}

export function RaidCards({
  items,
  canEdit,
  canDelete = canEdit,
  onEdit,
}: {
  items: RaidItemDto[];
  canEdit: boolean;
  /** Deleting is the PM's. */
  canDelete?: boolean;
  onEdit: (i: RaidItemDto) => void;
}) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
      {items.map((i) => (
        <Card
          key={i.id}
          className="item-card raid-table raid-item"
          p="md"
          data-clickable={canEdit ? "" : undefined}
          onClick={canEdit ? () => onEdit(i) : undefined}
        >
          <Group justify="space-between" align="baseline" wrap="nowrap" mb="xs">
            <div style={{ minWidth: 0 }}>
              <Badge size="xs" variant="light" mb={4} className="raid-mono raid-project-badge">
                {i.projectName || i.projectCode}
              </Badge>
              <Text size="sm" fw={600} className="raid-card-title">
                {i.description}
              </Text>
              <Text size="xs" mt={2} className="raid-sub raid-card-owner">
                {i.ownerName ?? "Unassigned"}
              </Text>
            </div>
            <MitigationSummary item={i} onOpen={onEdit} />
          </Group>
          <div className="raid-card-mitigations">
            {i.mitigatingActions.length === 0 ? (
              <Text size="xs" className="raid-sub">
                No mitigating actions
              </Text>
            ) : (
              <MitigationChecklist item={i} editable={canEdit} hideCount />
            )}
          </div>
          <div className="raid-card-foot">
            <Group
              mt="sm"
              pt="sm"
              justify="space-between"
              align="flex-end"
              wrap="wrap"
              className="raid-card-actions"
            >
              <Group gap="md" align="flex-end" wrap="nowrap" className="raid-meta">
                {i.isOverdue ? (
                  <div>
                    <Text size="xs" className="raid-sub">
                      Actions
                    </Text>
                    <Text size="sm" c="coral">
                      Overdue
                    </Text>
                  </div>
                ) : null}
                <div>
                  <Text size="xs" className="raid-sub" mb={2}>
                    Status
                  </Text>
                  <RaidStatusControl item={i} editable={canEdit} />
                </div>
              </Group>
              {canEdit ? <RaidActions item={i} onEdit={onEdit} canDelete={canDelete} /> : null}
            </Group>
          </div>
        </Card>
      ))}
    </SimpleGrid>
  );
}

export function RaidPage() {
  const isPm = useIsPm();
  const [params, setParams] = useSearchParams();
  // PMs see every project by default; others see one project at a time.
  const scope = params.get("project") ?? (isPm ? "all" : null);
  const isAll = scope === "all";
  const { project } = useCurrentProject(isAll ? null : scope);
  const allProjects = useProjects();
  const filters = {
    itemType: (params.get("type") as RaidType | null) ?? undefined,
    status: (params.get("status") as RaidStatus | null) ?? undefined,
    openOnly: params.get("all") !== "true",
  };
  const query = useRaid(isAll ? "all" : project?.id, filters);
  const [viewMode, setViewMode] = useViewMode("card");
  const [opened, { open, close }] = useDisclosure(false);
  const [editing, setEditing] = useState<RaidItemDto | undefined>();
  const readOnly = !project || !!project.archivedAt;

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };
  const openNew = () => {
    setEditing(undefined);
    open();
  };
  const openEdit = (item: RaidItemDto) => {
    setEditing(item);
    open();
  };

  return (
    <div className="raid-page">
      <PageHeader
        title="RAID Log"
        subtitle="Risks, assumptions, issues and dependencies. Anyone can submit; the PM assigns owners and resolves."
        actions={
          <Button className="raid-add-btn" onClick={openNew} disabled={readOnly}>
            Add item
          </Button>
        }
      />
      <Group mb="md" align="flex-end" wrap="wrap" className="raid-filters">
        <Select
          {...SELECT_UI}
          label="Project"
          allowDeselect={false}
          data={[
            ...(isPm ? [{ value: "all", label: "All projects" }] : []),
            ...(allProjects.data ?? [])
              .filter((p) => !p.archivedAt)
              .map((p) => ({ value: p.id, label: p.name })),
          ]}
          value={isAll ? "all" : (project?.id ?? null)}
          onChange={(v) => setParam("project", v)}
          w={200}
        />
        <Select
          {...SELECT_UI}
          label="Type"
          clearable
          placeholder="All types"
          data={TYPE_OPTIONS}
          value={filters.itemType ?? null}
          onChange={(v) => setParam("type", v)}
          w={160}
        />
        <Select
          {...SELECT_UI}
          label="Status"
          clearable
          placeholder="All statuses"
          data={STATUS_OPTIONS}
          value={filters.status ?? null}
          onChange={(v) => setParam("status", v)}
          w={160}
        />
        <Checkbox
          label="Include closed"
          className="raid-closed"
          checked={!filters.openOnly}
          onChange={(e) => setParam("all", e.currentTarget.checked ? "true" : null)}
        />
        <div className="raid-toggle" style={{ marginInlineStart: "auto" }}>
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
        </div>
      </Group>
      <QueryState
        query={query}
        isEmpty={(d) => d.length === 0}
        empty="No RAID items match these filters."
      >
        {(items) =>
          viewMode === "card" ? (
            <RaidCards items={items} canEdit={!readOnly} canDelete={!readOnly} onEdit={openEdit} />
          ) : (
            <div className="raid-card">
              <Table.ScrollContainer minWidth={960}>
                <Table verticalSpacing="xs" highlightOnHover className="raid-table">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>ID</Table.Th>
                      <Table.Th>Type</Table.Th>
                      <Table.Th>Description</Table.Th>
                      <Table.Th>Impact</Table.Th>
                      <Table.Th>Likelihood</Table.Th>
                      <Table.Th>Owner</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th />
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {items.map((i) => (
                      <Table.Tr
                        key={i.id}
                        style={!readOnly ? { cursor: "pointer" } : undefined}
                        onClick={!readOnly ? () => openEdit(i) : undefined}
                      >
                        <Table.Td>
                          <Text size="sm" fw={600} className="raid-mono">
                            {i.code}
                          </Text>
                          <Text size="xs" mt={2} className="raid-mono raid-sub">
                            {i.projectCode}
                          </Text>
                        </Table.Td>
                        <Table.Td>{ENUM_LABELS.raidType[i.itemType]}</Table.Td>
                        <Table.Td maw={360}>
                          <Text size="sm">{i.description}</Text>
                          <MitigationChecklist item={i} editable={!readOnly} />
                        </Table.Td>
                        <Table.Td>
                          <Badge className="raid-badge" data-severity={i.impact} variant="light">
                            {level(i.impact)}
                          </Badge>
                        </Table.Td>
                        <Table.Td>{level(i.likelihood)}</Table.Td>
                        <Table.Td>{i.ownerName ?? <Text c="dimmed">Unassigned</Text>}</Table.Td>
                        <Table.Td>
                          <RaidStatusControl item={i} editable={!readOnly} />
                          {i.isOverdue ? (
                            <Text size="xs" c="coral">
                              Overdue
                            </Text>
                          ) : null}
                        </Table.Td>
                        <Table.Td>
                          {!readOnly ? (
                            <RaidActions item={i} onEdit={openEdit} canDelete={!readOnly} />
                          ) : null}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            </div>
          )
        }
      </QueryState>
      <SideModal
        opened={opened}
        onClose={close}
        title={editing ? `Edit ${editing.code}` : "Add RAID item"}
        size="xl"
      >
        {project ? (
          <RaidForm
            key={editing?.id ?? "new"}
            projectId={project.id}
            existing={editing}
            isPm={isPm}
            onDone={close}
            onSaved={(pid) => (isAll ? undefined : setParam("project", pid))}
          />
        ) : null}
      </SideModal>
    </div>
  );
}
