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
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { KANO_CATEGORIES, KANO_LABELS, type KanoCategory, type KanoDto } from "@myapp/shared";
import {
  useCreateKano,
  useCurrentProject,
  useDeleteKano,
  useKano,
  useProjects,
  useUpdateKano,
  useUsers,
} from "../api/hooks";
import { useIsPm } from "../auth";
import { DeleteButton } from "../components/DeleteButton";
import { PageHeader, QueryState, toast } from "../components/ui";
import {
  draftsToSpecs,
  KanoSpecChecklist,
  KanoSpecsField,
  type KanoSpecDraft,
  specsToDrafts,
} from "../components/KanoSpecs";
import { SideModal } from "../components/SideModal";
import { ViewModeToggle } from "../components/ViewModeToggle";
import { useViewMode } from "../lib/viewMode";

const CATEGORY_OPTIONS = KANO_CATEGORIES.map((c) => ({ value: c, label: KANO_LABELS[c] }));

const CATEGORY_COLOR: Record<KanoCategory, string> = {
  must_be: "red",
  performance: "blue",
  attractive: "teal",
  indifferent: "gray",
  reverse: "orange",
};

export function SubmitModal({
  opened,
  onClose,
  projectId,
}: {
  opened: boolean;
  onClose: () => void;
  projectId: string;
}) {
  const projects = useProjects();
  const users = useUsers();
  const create = useCreateKano(projectId);
  const form = useForm({
    initialValues: {
      revisionRequest: "",
      projectId: "",
      specs: [] as KanoSpecDraft[],
      responsibleId: "",
    },
    validate: {
      revisionRequest: (v) => (v.trim() ? null : "Describe the revision request"),
    },
  });
  return (
    <SideModal opened={opened} onClose={onClose} title="Submit a request" size={860}>
      <form
        onSubmit={form.onSubmit((v) =>
          create.mutate(
            {
              revisionRequest: v.revisionRequest.trim(),
              specs: draftsToSpecs(v.specs),
              projectId: v.projectId || undefined,
              responsibleId: v.responsibleId || null,
            },
            {
              onSuccess: () => {
                form.reset();
                onClose();
              },
              onError: (e) => toast.error(e.message),
            },
          ),
        )}
      >
        <Stack>
          <Textarea
            label="Revision Request"
            autosize
            minRows={2}
            data-autofocus
            {...form.getInputProps("revisionRequest")}
          />
          <KanoSpecsField
            value={form.values.specs}
            onChange={(next) => form.setFieldValue("specs", next)}
          />
          <Select
            label="Project"
            clearable
            placeholder="Not sure yet"
            data={(projects.data ?? [])
              .filter((p) => !p.archivedAt)
              .map((p) => ({ value: p.id, label: p.name }))}
            {...form.getInputProps("projectId")}
          />
          <Select
            label="Person responsible"
            clearable
            searchable
            placeholder="Unassigned"
            data={(users.data ?? [])
              .filter((u) => u.isActive)
              .map((u) => ({ value: u.id, label: u.fullName }))}
            {...form.getInputProps("responsibleId")}
          />
          <Group justify="flex-end" className="side-modal-footer">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending}>
              Submit
            </Button>
          </Group>
        </Stack>
      </form>
    </SideModal>
  );
}

type EditValues = {
  revisionRequest: string;
  specs: KanoSpecDraft[];
  projectId: string;
  kanoCategory: string;
  responsibleId: string;
};

export function EditModal({
  request,
  onClose,
  isPm = true,
}: {
  request: KanoDto;
  onClose: () => void;
  /** Categorising and deleting a request are the PM's; team members edit the rest. */
  isPm?: boolean;
}) {
  const projects = useProjects();
  const users = useUsers();
  const update = useUpdateKano();
  const remove = useDeleteKano();
  const form = useForm<EditValues>({
    initialValues: {
      revisionRequest: request.revisionRequest,
      specs: specsToDrafts(request.specs),
      projectId: request.projectId,
      kanoCategory: request.kanoCategory ?? "",
      responsibleId: request.responsibleId ?? "",
    },
    validate: {
      revisionRequest: (v) => (v.trim() ? null : "Describe the revision request"),
    },
  });
  const save = form.onSubmit((v) =>
    update.mutate(
      {
        id: request.id,
        patch: {
          revisionRequest: v.revisionRequest.trim(),
          specs: draftsToSpecs(v.specs),
          projectId: v.projectId,
          ...(isPm ? { kanoCategory: (v.kanoCategory || null) as KanoCategory | null } : {}),
          responsibleId: v.responsibleId || null,
        },
      },
      { onSuccess: onClose, onError: (e) => toast.error(e.message) },
    ),
  );
  return (
    <SideModal opened onClose={onClose} title={request.code} size={860}>
      <form onSubmit={save}>
        <Stack>
          <Textarea
            label="Revision Request"
            autosize
            minRows={2}
            {...form.getInputProps("revisionRequest")}
          />
          <KanoSpecsField
            value={form.values.specs}
            onChange={(next) => form.setFieldValue("specs", next)}
          />
          <Group className="side-modal-pair" grow align="flex-start">
            <Select
              label="Project"
              allowDeselect={false}
              data={(projects.data ?? [])
                .filter((p) => !p.archivedAt || p.id === form.values.projectId)
                .map((p) => ({ value: p.id, label: p.name }))}
              {...form.getInputProps("projectId")}
            />
          </Group>
          <Group className="side-modal-pair" grow align="flex-start">
            <Select
              label="Kano category"
              clearable
              disabled={!isPm}
              placeholder="Not evaluated"
              data={CATEGORY_OPTIONS}
              {...form.getInputProps("kanoCategory")}
            />
          </Group>
          <Group className="side-modal-pair" grow align="flex-start">
            <Select
              label="Person responsible"
              clearable
              searchable
              placeholder="Unassigned"
              data={(users.data ?? [])
                .filter((u) => u.isActive || u.id === form.values.responsibleId)
                .map((u) => ({ value: u.id, label: u.fullName }))}
              {...form.getInputProps("responsibleId")}
            />
          </Group>
          <Group justify="flex-end" gap="xs">
            <DeleteButton
              confirmMessage={`Delete ${request.code}? This cannot be undone.`}
              loading={remove.isPending}
              onConfirm={() => {
                remove.mutate(request.id, {
                  onSuccess: onClose,
                  onError: (e) => toast.error(e.message),
                });
              }}
            />
            <Button variant="default" onClick={onClose}>
                Cancel
              </Button>
            <Button type="submit" loading={update.isPending}>
              Save
            </Button>
          </Group>
        </Stack>
      </form>
    </SideModal>
  );
}

function KanoCards({
  items,
  canEdit,
  onEdit,
}: {
  items: KanoDto[];
  canEdit: boolean;
  onEdit: (r: KanoDto) => void;
}) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
      {items.map((r) => (
        <Card
          key={r.id}
          className="item-card"
          p="md"
          data-clickable={canEdit ? "" : undefined}
          onClick={canEdit ? () => onEdit(r) : undefined}
        >
          <Group justify="space-between" align="flex-start" wrap="nowrap" mb="xs">
            <div>
              <Text size="sm" fw={600}>
                {r.revisionRequest}
              </Text>
              <Group gap="xs" mt={4} align="center">
                <Badge size="xs" variant="light" color="gray">
                  {r.projectName}
                </Badge>
                {r.responsibleName ? (
                  <Text size="xs" fw={600} c="blue">
                    {r.responsibleName}
                  </Text>
                ) : null}
              </Group>
            </div>
            {r.kanoCategory ? (
              <Badge color={CATEGORY_COLOR[r.kanoCategory]} variant="light">
                {KANO_LABELS[r.kanoCategory]}
              </Badge>
            ) : null}
          </Group>
          <KanoSpecChecklist request={r} editable={canEdit} />
          {canEdit ? (
            <Group mt="sm" justify="flex-end">
              <Button
                size="compact-xs"
                variant="default"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(r);
                }}
              >
                View
              </Button>
            </Group>
          ) : null}
        </Card>
      ))}
    </SimpleGrid>
  );
}

export function KanoPage() {
  const isPm = useIsPm();
  const [params, setParams] = useSearchParams();
  // PMs see every project by default; others see one project at a time.
  const scope = params.get("project") ?? (isPm ? "all" : null);
  const isAll = scope === "all";
  const { project } = useCurrentProject(isAll ? null : scope);
  const allProjects = useProjects();
  const filters = {
    kanoCategory: (params.get("category") as KanoCategory | null) ?? undefined,
    unevaluated: params.get("unevaluated") === "true",
    sort: (params.get("sort") as "newest" | "code" | null) ?? "newest",
  };
  const query = useKano(isAll ? "all" : project?.id, filters);
  const [viewMode, setViewMode] = useViewMode("card");
  const [submitOpen, submit] = useDisclosure(false);
  const [editing, setEditing] = useState<KanoDto | null>(null);
  const readOnly = !project || !!project.archivedAt;

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  return (
    <>
      <PageHeader
        title="KANO Request Tracker"
        subtitle="Requests from the people you build for. Categorize them and track each one's revision specs to completion."
        actions={
          <Button onClick={submit.open} disabled={readOnly}>
            Submit request
          </Button>
        }
      />
      <Group mb="md" align="flex-end" wrap="wrap">
        <Select
          label="Category"
          clearable
          placeholder="All"
          data={CATEGORY_OPTIONS}
          value={filters.kanoCategory ?? null}
          onChange={(v) => setParam("category", v)}
          w={190}
        />
        <Select
          label="Project"
          clearable={isPm}
          placeholder="All"
          data={(allProjects.data ?? [])
            .filter((p) => !p.archivedAt)
            .map((p) => ({ value: p.id, label: p.name }))}
          value={isAll ? null : (project?.id ?? null)}
          onChange={(v) => setParam("project", v ?? "all")}
          w={170}
        />
        <Select
          label="Sort by"
          allowDeselect={false}
          data={[
            { value: "newest", label: "Newest first" },
            { value: "code", label: "Request ID" },
          ]}
          value={filters.sort}
          onChange={(v) => setParam("sort", v === "newest" ? null : v)}
          w={150}
        />
        <Checkbox
          label="Not evaluated yet"
          mb={6}
          checked={filters.unevaluated}
          onChange={(e) => setParam("unevaluated", e.currentTarget.checked ? "true" : null)}
        />
        <div style={{ marginInlineStart: "auto" }}>
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
        </div>
      </Group>
      <QueryState query={query} isEmpty={(d) => d.length === 0} empty="No requests match.">
        {(items) =>
          viewMode === "card" ? (
            <KanoCards items={items} canEdit={!readOnly} onEdit={setEditing} />
          ) : (
            <Table.ScrollContainer minWidth={900}>
              <Table verticalSpacing="xs" highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>ID</Table.Th>
                    <Table.Th>Request</Table.Th>
                    <Table.Th>Category</Table.Th>
                    <Table.Th />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {items.map((r) => (
                    <Table.Tr
                      key={r.id}
                      style={!readOnly ? { cursor: "pointer" } : undefined}
                      onClick={!readOnly ? () => setEditing(r) : undefined}
                    >
                      <Table.Td>
                        <Text size="sm" fw={600}>
                          {r.code}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {r.projectName}
                        </Text>
                      </Table.Td>
                      <Table.Td maw={380}>
                        <Text size="sm">{r.revisionRequest}</Text>
                        <KanoSpecChecklist request={r} editable={!readOnly} />
                      </Table.Td>
                      <Table.Td>
                        {r.kanoCategory ? (
                          <Badge color={CATEGORY_COLOR[r.kanoCategory]} variant="light">
                            {KANO_LABELS[r.kanoCategory]}
                          </Badge>
                        ) : (
                          <Text size="sm" c="dimmed">
                            Not evaluated
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        {!readOnly ? (
                          <Button
                            size="compact-xs"
                            variant="default"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditing(r);
                            }}
                          >
                            Evaluate
                          </Button>
                        ) : null}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )
        }
      </QueryState>
      {project ? (
        <SubmitModal opened={submitOpen} onClose={submit.close} projectId={project.id} />
      ) : null}
      {project && editing ? (
        <EditModal
          key={editing.id}
          request={editing}
          isPm={isPm}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  );
}
