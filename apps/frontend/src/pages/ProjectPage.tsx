import { useState } from "react";
import { PaginationBar, paginateItems } from "../components/PaginationBar";
import {
  Alert,
  Anchor,
  Button,
  Card,
  Group,
  Select,
  Stack,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure, useLocalStorage } from "@mantine/hooks";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  SOURCE_MODULE_LABELS,
  WORK_SOURCE_MODULES,
  WORK_STATUS_FILTERS,
  WORK_STATUS_LABELS,
  workSourceModuleSchema,
  workStatusFilterSchema,
} from "@myapp/shared";
import { useCreateActivity, useProjectWorkItems, useProjects, useUsers } from "../api/hooks";
import { useAuth, useIsPm } from "../auth";
import { useOpenActivity } from "../components/ActivityRow";
import { SideModal } from "../components/SideModal";
import { WorkItemsView, WorkViewSwitch, type WorkView } from "../components/WorkItems";
import { PageHeader, QueryState, toast } from "../components/ui";

const MODULE_OPTIONS = WORK_SOURCE_MODULES.map((m) => ({
  value: m,
  label: SOURCE_MODULE_LABELS[m],
}));
const STATUS_OPTIONS = WORK_STATUS_FILTERS.map((s) => ({ value: s, label: WORK_STATUS_LABELS[s] }));

export function ProjectPage() {
  const { projectId } = useParams();
  const isPm = useIsPm();
  const projects = useProjects();
  const project = projects.data?.find((p) => p.id === projectId);

  return (
    <QueryState query={projects}>
      {() =>
        !project ? (
          <Alert color="coral" title="Project not found">
            <Anchor component={Link} to="/projects">
              Back to projects
            </Anchor>
          </Alert>
        ) : (
          <>
            <PageHeader
              variant="projects"
              title={project.name}
              subtitle={`${project.code}${project.archivedAt ? " · Archived (read-only)" : ""}`}
            />
            <Button
              component={Link}
              to="/projects"
              variant="subtle"
              size="compact-sm"
              leftSection="←"
              mb="sm"
              ml={-8}
            >
              Back to Projects
            </Button>
            <ProjectWork projectId={project.id} readOnly={!!project.archivedAt} canCreate={isPm} />
          </>
        )
      }
    </QueryState>
  );
}

// ------------------------------------------------------------ project work
/**
 * Every action of the project: its own activities plus the actions, dates and assignees from User Story Mapping,
 * OST, Kano and RAID, from the same source as Home and Workload. Filters live in the URL (?module, ?status, ?assignee).
 */
function ProjectWork({
  projectId,
  canCreate,
  readOnly,
}: {
  projectId: string;
  canCreate: boolean;
  readOnly: boolean;
}) {
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const moduleFilter = workSourceModuleSchema.safeParse(params.get("module")).data;
  const status = workStatusFilterSchema.safeParse(params.get("status")).data;
  const assigneeId = params.get("assignee") ?? undefined;
  const users = useUsers();
  const me = useAuth();
  const openActivity = useOpenActivity();
  const projects = useProjects();
  const projectNames = new Map((projects.data ?? []).map((p) => [p.id, p.name]));
  const [view, setView] = useLocalStorage<WorkView>({
    key: `project.view.${me.id}`,
    defaultValue: "list",
  });
  const query = useProjectWorkItems(projectId, { module: moduleFilter, status, assigneeId });
  const [opened, { open, close }] = useDisclosure();
  const hasFilters = !!(moduleFilter || status || assigneeId);

  const setFilter = (key: "module" | "status" | "assignee", value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };
  const clearFilters = () => {
    const next = new URLSearchParams(params);
    for (const key of ["module", "status", "assignee"]) next.delete(key);
    setParams(next, { replace: true });
  };
  const select = (
    label: string,
    key: "module" | "status" | "assignee",
    value: string | undefined,
    data: Array<{ value: string; label: string }>,
  ) => (
    <Select
      label={label}
      placeholder="Any"
      clearable
      searchable
      size="xs"
      w={170}
      data={data}
      value={value ?? null}
      onChange={(v) => setFilter(key, v)}
    />
  );

  return (
    <Stack>
      <Group align="flex-end" wrap="wrap" gap="xs">
        {select("Module", "module", moduleFilter, MODULE_OPTIONS)}
        {select("Status", "status", status, STATUS_OPTIONS)}
        {select(
          "Assignee",
          "assignee",
          assigneeId,
          (users.data ?? []).map((u) => ({ value: u.id, label: u.fullName })),
        )}
        <Button size="xs" variant="default" onClick={() => setFilter("assignee", me.id)}>
          Assigned to me
        </Button>
        {hasFilters ? (
          <Button size="xs" variant="subtle" onClick={clearFilters}>
            Clear filters
          </Button>
        ) : null}
        <Group ml="auto" gap="xs">
          <WorkViewSwitch value={view} onChange={setView} />
          {canCreate && !readOnly ? (
            <Button size="xs" onClick={open}>
              New activity
            </Button>
          ) : null}
        </Group>
      </Group>

      <QueryState
        query={query}
        isEmpty={(d) => d.items.length === 0}
        empty={hasFilters ? "No activities match these filters." : "No activities yet."}
      >
        {(data) => {
          const paged = paginateItems(data.items, page);
          return (
            <Card withBorder padding={0}>
              <div style={{ maxHeight: 480, overflowY: "auto" }}>
                <WorkItemsView
                  items={paged.items}
                  view={view}
                  projectNames={projectNames}
                  detailed
                  checkable
                  deletable
                  onOpen={(item) =>
                    item.sourceModule === "project" ? () => openActivity(item.id) : undefined
                  }
                />
              </div>
              {paged.total > 20 ? (
                <div style={{ padding: "0 12px 10px" }}>
                  <PaginationBar page={paged.page} total={paged.total} onPageChange={setPage} />
                </div>
              ) : null}
            </Card>
          );
        }}
      </QueryState>
      {canCreate ? (
        <NewActivityModal projectId={projectId} opened={opened} onClose={close} />
      ) : null}
    </Stack>
  );
}

function NewActivityModal({
  projectId,
  opened,
  onClose,
}: {
  projectId: string;
  opened: boolean;
  onClose: () => void;
}) {
  const create = useCreateActivity(projectId);
  const users = useUsers();
  const form = useForm({
    initialValues: {
      title: "",
      assigneeId: null as string | null,
      dueDate: "",
      description: "",
    },
    validate: { title: (v) => (v.trim() ? null : "Enter a title") },
  });
  return (
    <SideModal opened={opened} onClose={onClose} title="New activity">
      <form
        onSubmit={form.onSubmit((v) =>
          create.mutate(
            {
              title: v.title.trim(),
              assigneeId: v.assigneeId,
              dueDate: v.dueDate || null,
              description: v.description || null,
            },
            {
              onSuccess: () => {
                toast.ok("Activity created");
                form.reset();
                onClose();
              },
              onError: (e) => toast.error(e.message),
            },
          ),
        )}
      >
        <Stack>
          <TextInput label="Title" data-autofocus {...form.getInputProps("title")} />
          <Textarea
            label="Description"
            autosize
            minRows={2}
            {...form.getInputProps("description")}
          />
          <Select
            label="Assignee"
            clearable
            searchable
            data={(users.data ?? [])
              .filter((u) => u.isActive)
              .map((u) => ({ value: u.id, label: u.fullName }))}
            {...form.getInputProps("assigneeId")}
          />
          <TextInput label="Due date" type="date" {...form.getInputProps("dueDate")} />
          <Group justify="flex-end" className="side-modal-footer">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending}>
              Create
            </Button>
          </Group>
        </Stack>
      </form>
    </SideModal>
  );
}
