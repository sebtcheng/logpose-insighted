import {
  Anchor,
  Badge,
  Button,
  Checkbox,
  Group,
  MultiSelect,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { zod4Resolver } from "mantine-form-zod-resolver";
import { useMemo, useState, type KeyboardEvent } from "react";
import { ColumnHeader, compareNullable, toggleSortConfig, type SortConfig } from "../components/ColumnHeader";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { createProjectSchema, createSubprojectSchema } from "@myapp/shared";
import type { ProjectDto, SubprojectDto } from "@myapp/shared";
import {
  useCreateProject,
  useCreateSubproject,
  useDeleteProject,
  useDeleteSubproject,
  useProjects,
  useProjectsWithSubprojects,
  useUpdateProject,
  useUpdateSubproject,
  useUsers,
} from "../api/hooks";
import { useAuth, useIsPm } from "../auth";
import { PageHeader, QueryState, fmtDate, toast } from "../components/ui";
import { SideModal } from "../components/SideModal";

type ProjectRow = ProjectDto & { subprojects: SubprojectDto[] };

function SubprojectModal(props: {
  projectId: string;
  subproject: SubprojectDto | null;
  onClose: () => void;
}) {
  const { projectId, subproject, onClose } = props;
  const create = useCreateSubproject(projectId);
  const update = useUpdateSubproject();
  const users = useUsers();
  const leadData = (users.data ?? [])
    .filter((u) => u.isActive)
    .map((u) => ({ value: u.id, label: u.fullName }));
  const form = useForm({
    initialValues: {
      name: subproject?.name ?? "",
      description: subproject?.description ?? "",
      leadId: subproject?.leadId ?? null,
    },
    validate: zod4Resolver(createSubprojectSchema.pick({ name: true })),
  });
  const done = {
    onSuccess: () => {
      toast.ok(subproject ? "Subproject updated" : "Subproject created");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  };
  return (
    <form
      onSubmit={form.onSubmit((v) =>
        subproject
          ? update.mutate(
              {
                id: subproject.id,
                patch: { name: v.name, description: v.description, leadId: v.leadId },
              },
              done,
            )
          : create.mutate({ ...v, health: "on_track" }, done),
      )}
    >
      <Stack>
        <TextInput label="Name" data-autofocus {...form.getInputProps("name")} />
        <Textarea label="Description" {...form.getInputProps("description")} />
        <Select
          label="Team member"
          placeholder="Unassigned"
          clearable
          searchable
          data={leadData}
          {...form.getInputProps("leadId")}
        />
        <Group justify="flex-end" className="side-modal-footer">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={create.isPending || update.isPending}>
            {subproject ? "Save" : "Create"}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

type InputProps = ReturnType<ReturnType<typeof useForm>["getInputProps"]>;

/** Owner and Team members pickers shared by the New and Edit project modals. */
function TeamFields(props: { owner: InputProps; members: InputProps }) {
  const users = useUsers();
  const options = (users.data ?? [])
    .filter((u) => u.isActive)
    .map((u) => ({ value: u.id, label: u.fullName }));
  return (
    <>
      <Select
        label="Owner"
        placeholder="Select an owner"
        data={options}
        searchable
        allowDeselect={false}
        {...props.owner}
      />
      <MultiSelect
        label="Team members"
        placeholder="Select team members"
        data={options}
        searchable
        clearable
        {...props.members}
      />
    </>
  );
}

function EditProjectModal(props: { project: ProjectRow; onClose: () => void }) {
  const { project, onClose } = props;
  const update = useUpdateProject();
  const form = useForm({
    initialValues: {
      name: project.name,
      ownerId: project.ownerId,
      memberIds: project.memberIds ?? [],
    },
    validate: zod4Resolver(createProjectSchema),
  });
  return (
    <form
      onSubmit={form.onSubmit((v) =>
        update.mutate(
          { id: project.id, patch: v },
          {
            onSuccess: () => {
              toast.ok("Project updated");
              onClose();
            },
            onError: (e) => toast.error(e.message),
          },
        ),
      )}
    >
      <Stack>
        <TextInput label="Name" data-autofocus {...form.getInputProps("name")} />
        <TeamFields
          owner={form.getInputProps("ownerId")}
          members={form.getInputProps("memberIds")}
        />
        <Group justify="flex-end" className="side-modal-footer">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={update.isPending}>
            Save
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

type ProjSortKey = "name" | "code" | "owner" | "members" | "createdAt";
type ProjFilters = {
  name: string;
  code: string;
  owners: string[];
  members: string[];
  created: string[];
};
const EMPTY_PROJ_FILTERS: ProjFilters = {
  name: "",
  code: "",
  owners: [],
  members: [],
  created: [],
};

function ProjectsTableWrap<
  T extends ProjectDto & { teamMembers?: Array<{ fullName: string }> },
>({
  items,
  renderRows,
}: {
  items: T[];
  renderRows: (sorted: T[]) => React.ReactNode;
}) {
  const [sort, setSort] = useState<SortConfig<ProjSortKey>>({ key: null, direction: "asc" });
  const [filters, setFilters] = useState<ProjFilters>(EMPTY_PROJ_FILTERS);
  const hasFilters =
    Boolean(filters.name.trim()) ||
    Boolean(filters.code.trim()) ||
    filters.owners.length > 0 ||
    filters.members.length > 0 ||
    filters.created.length > 0;

  const ownerOpts = useMemo(
    () => [...new Set(items.map((p) => p.ownerName ?? "—"))].sort(),
    [items],
  );
  const memberOpts = useMemo(
    () => [...new Set(items.flatMap((p) => (p.teamMembers ?? []).map((m) => m.fullName)))].sort(),
    [items],
  );
  const createdOpts = useMemo(
    () => [...new Set(items.map((p) => fmtDate(p.createdAt)))],
    [items],
  );

  const visible = useMemo(() => {
    const qName = filters.name.trim().toLowerCase();
    const qCode = filters.code.trim().toLowerCase();
    const filtered = items.filter((p) => {
      if (qName && !p.name.toLowerCase().includes(qName)) return false;
      if (qCode && !p.code.toLowerCase().includes(qCode)) return false;
      if (filters.owners.length && !filters.owners.includes(p.ownerName ?? "—")) return false;
      if (
        filters.members.length &&
        !(p.teamMembers ?? []).some((m) => filters.members.includes(m.fullName))
      )
        return false;
      if (filters.created.length && !filters.created.includes(fmtDate(p.createdAt))) return false;
      return true;
    });
    if (!sort.key) return filtered;
    const { key, direction } = sort;
    return [...filtered].sort((a, b) => {
      switch (key) {
        case "name":
          return compareNullable(a.name.toLowerCase(), b.name.toLowerCase(), direction);
        case "code": {
          const cmp = a.code.localeCompare(b.code, undefined, { numeric: true });
          return direction === "asc" ? cmp : -cmp;
        }
        case "owner":
          return compareNullable(a.ownerName ?? null, b.ownerName ?? null, direction);
        case "members": {
          const am = (a.teamMembers ?? []).map((m) => m.fullName).join(", ") || null;
          const bm = (b.teamMembers ?? []).map((m) => m.fullName).join(", ") || null;
          return compareNullable(am, bm, direction);
        }
        case "createdAt":
          return compareNullable(a.createdAt, b.createdAt, direction);
      }
    });
  }, [items, filters, sort]);

  const handleSort = (key: ProjSortKey) => setSort((prev) => toggleSortConfig(prev, key));

  return (
    <>
      {hasFilters ? (
        <Group justify="flex-end" mb="xs">
          <Button size="compact-xs" variant="subtle" onClick={() => setFilters(EMPTY_PROJ_FILTERS)}>
            Clear filters
          </Button>
        </Group>
      ) : null}
      <Table.ScrollContainer minWidth={520}>
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <ColumnHeader
                label="Project"
                colKey="name"
                sort={sort}
                onSort={handleSort}
                activeFilterCount={filters.name ? 1 : 0}
                onClearFilter={() => setFilters((f) => ({ ...f, name: "" }))}
              >
                <TextInput
                  size="xs"
                  placeholder="Search project..."
                  value={filters.name}
                  onChange={(e) => setFilters((f) => ({ ...f, name: e.currentTarget.value }))}
                />
              </ColumnHeader>
              <ColumnHeader
                label="Code"
                colKey="code"
                sort={sort}
                onSort={handleSort}
                activeFilterCount={filters.code ? 1 : 0}
                onClearFilter={() => setFilters((f) => ({ ...f, code: "" }))}
              >
                <TextInput
                  size="xs"
                  placeholder="Search code..."
                  value={filters.code}
                  onChange={(e) => setFilters((f) => ({ ...f, code: e.currentTarget.value }))}
                />
              </ColumnHeader>
              <ColumnHeader
                label="Owner"
                colKey="owner"
                sort={sort}
                onSort={handleSort}
                activeFilterCount={filters.owners.length}
                onClearFilter={() => setFilters((f) => ({ ...f, owners: [] }))}
              >
                <Checkbox.Group
                  value={filters.owners}
                  onChange={(v) => setFilters((f) => ({ ...f, owners: v }))}
                >
                  <Stack gap={4}>
                    {ownerOpts.map((opt) => (
                      <Checkbox key={opt} size="xs" value={opt} label={opt} />
                    ))}
                  </Stack>
                </Checkbox.Group>
              </ColumnHeader>
              <ColumnHeader
                label="Team members"
                colKey="members"
                sort={sort}
                onSort={handleSort}
                activeFilterCount={filters.members.length}
                onClearFilter={() => setFilters((f) => ({ ...f, members: [] }))}
              >
                <Checkbox.Group
                  value={filters.members}
                  onChange={(v) => setFilters((f) => ({ ...f, members: v }))}
                >
                  <Stack gap={4}>
                    {memberOpts.map((opt) => (
                      <Checkbox key={opt} size="xs" value={opt} label={opt} />
                    ))}
                  </Stack>
                </Checkbox.Group>
              </ColumnHeader>
              <ColumnHeader
                label="Created"
                colKey="createdAt"
                sort={sort}
                onSort={handleSort}
                activeFilterCount={filters.created.length}
                onClearFilter={() => setFilters((f) => ({ ...f, created: [] }))}
              >
                <Checkbox.Group
                  value={filters.created}
                  onChange={(v) => setFilters((f) => ({ ...f, created: v }))}
                >
                  <Stack gap={4}>
                    {createdOpts.map((opt) => (
                      <Checkbox key={opt} size="xs" value={opt} label={opt} />
                    ))}
                  </Stack>
                </Checkbox.Group>
              </ColumnHeader>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{renderRows(visible)}</Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </>
  );
}

export function ProjectsPage() {
  const isPm = useIsPm();
  const me = useAuth();
  const [params] = useSearchParams();
  const projects = useProjects();
  const tree = useProjectsWithSubprojects();
  const [opened, { open, close }] = useDisclosure();
  const [editing, setEditing] = useState<ProjectRow | null>(null);
  const [subTarget, setSubTarget] = useState<{
    projectId: string;
    subproject: SubprojectDto | null;
  } | null>(null);
  const create = useCreateProject();
  const delProject = useDeleteProject();
  const delSub = useDeleteSubproject();
  const form = useForm({
    initialValues: {
      name: "",
      ownerId: me.id,
      memberIds: [] as string[],
    },
    validate: zod4Resolver(createProjectSchema),
  });

  // Search results and shared links point at /projects?subprojectId=…; send them to the current project's activity list.
  const subprojectId = params.get("subprojectId");
  const first = projects.data?.find((p) => !p.archivedAt);
  if (subprojectId && first)
    return <Navigate to={`/projects/${first.id}?subprojectId=${subprojectId}`} replace />;

  // Project rows open the edit form for everyone; subproject rows stay PM-only.
  const rowProps = (onOpen: () => void, enabled = isPm) =>
    enabled
      ? {
          tabIndex: 0,
          style: { cursor: "pointer" },
          onClick: onOpen,
          onKeyDown: (e: KeyboardEvent<HTMLTableRowElement>) => {
            if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              onOpen();
            }
          },
        }
      : {};

  const confirmDelete = (what: string, run: () => void) => {
    if (window.confirm(`Delete ${what}? This cannot be undone.`)) run();
  };

  return (
    <>
      <PageHeader
        variant="projects"
        title="Projects"
        actions={<Button onClick={open}>New project</Button>}
      />
      <QueryState query={tree} isEmpty={(d) => d.length === 0} empty="No projects yet.">
        {(items) => (
          <ProjectsTableWrap
            items={items}
            renderRows={(visible) =>
              visible.flatMap((p) => [
                  <Table.Tr key={p.id} {...rowProps(() => setEditing(p), true)}>
                    <Table.Td>
                      <Anchor
                        component={Link}
                        to={`/projects/${p.id}`}
                        fw={600}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {p.name}
                      </Anchor>
                      {p.archivedAt ? (
                        <Text size="xs" c="dimmed">
                          Archived
                        </Text>
                      ) : null}
                    </Table.Td>
                    <Table.Td>{p.code}</Table.Td>
                    <Table.Td data-col="owner">{p.ownerName ?? "—"}</Table.Td>
                    <Table.Td data-col="members">
                      {p.members && p.members.length > 0 ? (
                        <Group gap={4} wrap="wrap">
                          {p.members.map((m) => (
                            <Badge key={m.id} variant="light" color="navy">
                              {m.fullName}
                            </Badge>
                          ))}
                        </Group>
                      ) : (
                        "—"
                      )}
                    </Table.Td>
                    <Table.Td>{fmtDate(p.createdAt)}</Table.Td>
                    <Table.Td>
                      <Group
                        gap="xs"
                        justify="flex-end"
                        wrap="nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isPm ? (
                          <Button
                            size="compact-sm"
                            variant="default"
                            onClick={() => setSubTarget({ projectId: p.id, subproject: null })}
                          >
                            Add subproject
                          </Button>
                        ) : null}
                        <Button size="compact-sm" variant="default" onClick={() => setEditing(p)}>
                          Edit
                        </Button>
                        {isPm ? (
                          <Button
                            size="compact-sm"
                            variant="default"
                            color="coral"
                            onClick={() =>
                              confirmDelete(`project ${p.name}`, () =>
                                delProject.mutate(p.id, {
                                  onSuccess: () => toast.ok("Project deleted"),
                                  onError: (e) => toast.error(e.message),
                                }),
                              )
                            }
                          >
                            Delete
                          </Button>
                        ) : null}
                      </Group>
                    </Table.Td>
                  </Table.Tr>,
                  ...p.subprojects.map((s) => (
                    <Table.Tr
                      key={s.id}
                      {...rowProps(() => setSubTarget({ projectId: p.id, subproject: s }))}
                    >
                      <Table.Td pl="xl">
                        <Text size="sm">{s.name}</Text>
                      </Table.Td>
                      <Table.Td>{s.code}</Table.Td>
                      <Table.Td />
                      <Table.Td />
                      <Table.Td />
                      {isPm ? (
                        <Table.Td>
                          <Group
                            gap="xs"
                            justify="flex-end"
                            wrap="nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              size="compact-sm"
                              variant="default"
                              onClick={() => setSubTarget({ projectId: p.id, subproject: s })}
                            >
                              Edit
                            </Button>
                            <Button
                              size="compact-sm"
                              variant="default"
                              color="coral"
                              onClick={() =>
                                confirmDelete(`subproject ${s.name}`, () =>
                                  delSub.mutate(s.id, {
                                    onSuccess: () => toast.ok("Subproject deleted"),
                                    onError: (e) => toast.error(e.message),
                                  }),
                                )
                              }
                            >
                              Delete
                            </Button>
                          </Group>
                        </Table.Td>
                      ) : (
                        <Table.Td />
                      )}
                    </Table.Tr>
                  )),
                ])
            }
          />
        )}
      </QueryState>

      <SideModal opened={!!editing} onClose={() => setEditing(null)} title="Edit project">
        {editing ? <EditProjectModal project={editing} onClose={() => setEditing(null)} /> : null}
      </SideModal>
      <SideModal
        opened={!!subTarget}
        onClose={() => setSubTarget(null)}
        title={subTarget?.subproject ? "Edit subproject" : "New subproject"}
      >
        {subTarget ? (
          <SubprojectModal
            key={subTarget.subproject?.id ?? "new"}
            projectId={subTarget.projectId}
            subproject={subTarget.subproject}
            onClose={() => setSubTarget(null)}
          />
        ) : null}
      </SideModal>

      <SideModal opened={opened} onClose={close} title="New project">
        <form
          onSubmit={form.onSubmit((v) =>
            create.mutate(v, {
              onSuccess: () => {
                toast.ok("Project created");
                form.reset();
                close();
              },
              onError: (e) => toast.error(e.message),
            }),
          )}
        >
          <Stack>
            <TextInput label="Name" data-autofocus {...form.getInputProps("name")} />
            <TeamFields
              owner={form.getInputProps("ownerId")}
              members={form.getInputProps("memberIds")}
            />
            <Group justify="flex-end" className="side-modal-footer">
              <Button variant="default" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" loading={create.isPending}>
                Create
              </Button>
            </Group>
          </Stack>
        </form>
      </SideModal>
    </>
  );
}
