import { Fragment, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Progress,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { usmStepSummary, type UsmStepDto } from "@myapp/shared";
import {
  useCreateUsmPersona,
  useCreateUsmStep,
  useCurrentProject,
  useProjects,
  useReorderUsmSteps,
  useUsmPersonas,
  useUsmSteps,
} from "../api/hooks";
import { useIsPm } from "../auth";
import { SideModal } from "../components/SideModal";
import { UsmStepModal } from "../components/UsmStepModal";
import { PageHeader, QueryState, toast } from "../components/ui";

/** "Today" under the app's Asia/Manila date rule, as YYYY-MM-DD. */
const manilaToday = (): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());

function StepCard({
  step,
  index,
  total,
  today,
  canReorder,
  dropCue,
  onOpen,
  onMove,
  onDragStartStep,
  onDragEndStep,
}: {
  step: UsmStepDto;
  index: number;
  total: number;
  today: string;
  canReorder: boolean;
  /** "before" / "after": where a dragged card would land relative to this one. */
  dropCue: "before" | "after" | null;
  onOpen: () => void;
  onMove: (to: number) => void;
  onDragStartStep: () => void;
  onDragEndStep: () => void;
}) {
  const sum = usmStepSummary(step.features, today);
  const pct = sum.total === 0 ? 0 : Math.round((sum.completed / sum.total) * 100);
  const state =
    sum.total > 0 && sum.completed === sum.total
      ? { label: "Complete", color: "sea" }
      : sum.completed > 0
        ? { label: "In progress", color: "sea" }
        : { label: sum.total === 0 ? "No features" : "Not started", color: "navy" };
  return (
    <Card
      className="item-card usm-card usm-step"
      p={0}
      data-step={step.id}
      data-drop={dropCue ?? undefined}
      role="button"
      tabIndex={0}
      aria-label={`Step ${index + 1}: ${step.title}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      {canReorder ? (
        <div
          className="usm-grip"
          draggable
          aria-hidden="true"
          title="Drag to reorder"
          data-grip={step.id}
          onClick={(e) => e.stopPropagation()}
          onDragStart={(e) => {
            e.stopPropagation();
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", step.id);
            const card = e.currentTarget.closest(".usm-step");
            if (card) e.dataTransfer.setDragImage(card, 24, 16);
            onDragStartStep();
          }}
          onDragEnd={onDragEndStep}
        >
          <span className="usm-grip-dots">⋮⋮⋮</span>
        </div>
      ) : null}
      <Stack gap="xs" p="md" className="usm-step-body">
        <Group justify="space-between" wrap="nowrap" align="flex-start">
          <Text className="usm-step-number" aria-hidden="true">
            {index + 1}
          </Text>
          {canReorder ? (
            <Group gap={4} wrap="nowrap" onClick={(e) => e.stopPropagation()}>
              <ActionIcon
                variant="subtle"
                className="usm-action"
                aria-label={`Move step ${index + 1} left`}
                disabled={index === 0}
                onClick={() => onMove(index - 1)}
              >
                ←
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                className="usm-action"
                aria-label={`Move step ${index + 1} right`}
                disabled={index === total - 1}
                onClick={() => onMove(index + 1)}
              >
                →
              </ActionIcon>
            </Group>
          ) : null}
        </Group>
        <Text size="sm" fw={600} className="raid-card-title">
          {step.title}
        </Text>
        {step.description?.trim() ? (
          <Text size="xs" c="dimmed" lineClamp={2} className="usm-step-desc">
            {step.description}
          </Text>
        ) : null}
        <Progress
          value={pct}
          size="sm"
          color={state.color}
          aria-label={`Step ${index + 1} feature completion`}
        />
        <Group gap="xs">
          <Text size="xs" className="raid-sub">
            {sum.completed}/{sum.total} features completed
          </Text>
          <Badge size="xs" variant="light" color={state.color} data-state={state.label}>
            {state.label}
          </Badge>
          {sum.overdue > 0 ? (
            <Badge size="xs" color="coral" variant="light">
              {sum.overdue} overdue
            </Badge>
          ) : null}
        </Group>
      </Stack>
    </Card>
  );
}

function InsertButton({ at, onInsert }: { at: number; onInsert: (at: number) => void }) {
  return (
    <div className="usm-insert">
      <ActionIcon
        variant="subtle"
        size="sm"
        className="usm-action"
        aria-label={`Insert step at position ${at + 1}`}
        onClick={() => onInsert(at)}
      >
        +
      </ActionIcon>
    </div>
  );
}

/** Steps left to right: a + slot before the first card, between every pair, and after the last. */
function StepTrack({
  steps,
  today,
  canEdit,
  onOpen,
  onMove,
  onInsert,
}: {
  steps: UsmStepDto[];
  today: string;
  canEdit: boolean;
  onOpen: (id: string) => void;
  onMove: (from: number, to: number) => void;
  onInsert: (at: number) => void;
}) {
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const end = () => {
    setDragFrom(null);
    setOverIndex(null);
  };
  const cueFor = (i: number): "before" | "after" | null =>
    dragFrom === null || overIndex !== i || dragFrom === i
      ? null
      : dragFrom > i
        ? "before"
        : "after";
  return (
    <div className="usm-track" role="list" aria-label="Journey steps">
      {steps.map((s, i) => (
        <Fragment key={s.id}>
          {canEdit ? <InsertButton at={i} onInsert={onInsert} /> : null}
          <div
            role="listitem"
            className="usm-slot"
            onDragOver={(e) => {
              if (dragFrom === null) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (overIndex !== i) setOverIndex(i);
            }}
            onDrop={(e) => {
              if (dragFrom === null) return;
              e.preventDefault();
              const from = dragFrom;
              end();
              if (from !== i) onMove(from, i);
            }}
          >
            <StepCard
              step={s}
              index={i}
              total={steps.length}
              today={today}
              canReorder={canEdit}
              dropCue={cueFor(i)}
              onOpen={() => onOpen(s.id)}
              onMove={(to) => onMove(i, to)}
              onDragStartStep={() => setDragFrom(i)}
              onDragEndStep={end}
            />
          </div>
        </Fragment>
      ))}
      {canEdit ? <InsertButton at={steps.length} onInsert={onInsert} /> : null}
    </div>
  );
}

function AddStepModal({
  opened,
  onClose,
  projectId,
  personaId,
  insertAtIndex,
}: {
  opened: boolean;
  onClose: () => void;
  projectId: string;
  personaId: string;
  insertAtIndex: number | undefined;
}) {
  const create = useCreateUsmStep();
  const form = useForm({
    initialValues: { title: "" },
    validate: { title: (v) => (v.trim() ? null : "Enter the step") },
  });
  return (
    <SideModal opened={opened} onClose={onClose} title="Add step">
      <form
        onSubmit={form.onSubmit((v) =>
          create.mutate(
            { projectId, personaId, title: v.title.trim(), insertAtIndex },
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
          <TextInput
            label="What does the user do?"
            placeholder="e.g. Sign in to the app"
            data-autofocus
            {...form.getInputProps("title")}
          />
          <Group justify="flex-end" className="side-modal-footer">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending}>
              Add
            </Button>
          </Group>
        </Stack>
      </form>
    </SideModal>
  );
}

function AddUser({ projectId, onAdded }: { projectId: string; onAdded: (id: string) => void }) {
  const create = useCreateUsmPersona();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // A real form: the button click and Enter both land here, so neither can be a silent no-op.
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (create.isPending) return;
    const next = name.trim();
    if (!next) {
      setError("Enter a user or role");
      inputRef.current?.focus();
      return;
    }
    setError(null);
    create.mutate(
      { projectId, name: next },
      {
        onSuccess: (p) => {
          setName("");
          onAdded(p.id);
        },
        onError: (err) => {
          setError(err.message);
          inputRef.current?.focus();
        },
      },
    );
  };
  return (
    <form onSubmit={submit} noValidate>
      <Group gap="xs" wrap="nowrap" align="flex-start">
        <TextInput
          ref={inputRef}
          aria-label="New user name"
          placeholder="User or role"
          maxLength={80}
          value={name}
          error={error}
          onChange={(e) => {
            setName(e.currentTarget.value);
            if (error) setError(null);
          }}
        />
        <Button type="submit" variant="default" loading={create.isPending}>
          Add user
        </Button>
      </Group>
    </form>
  );
}

export function StoryMapPage() {
  const isPm = useIsPm();
  // Team members add and edit User Story Mapping in their projects (the server scopes them); deleting is the PM's.
  const canAdd = true;
  const [params, setParams] = useSearchParams();
  const allProjects = useProjects();
  // `all` lists every visible project's users and steps; creating a user still needs one concrete project.
  const isAll = params.get("project") === "all";
  const { project: current } = useCurrentProject(isAll ? null : params.get("project"));
  const project = isAll ? undefined : current;
  const queryProject = isAll ? "all" : project?.id;
  const personas = useUsmPersonas(queryProject);
  const personaParam = params.get("user");
  const persona = personas.data?.find((p) => p.id === personaParam) ?? personas.data?.[0];
  const steps = useUsmSteps(queryProject, persona?.id);
  const reorder = useReorderUsmSteps();
  const [openId, setOpenId] = useState<string | null>(null);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const [addOpen, addModal] = useDisclosure(false);
  const [insertAt, setInsertAt] = useState<number | undefined>();
  // In the all-projects view a step belongs to its own user's project.
  const activeProject = isAll
    ? allProjects.data?.find((p) => p.id === persona?.projectId)
    : project;
  const readOnly = !activeProject || !!activeProject.archivedAt;
  const today = manilaToday();

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === "project") next.delete("user");
    setParams(next, { replace: true });
  };
  const startAdd = (at?: number) => {
    setInsertAt(at);
    addModal.open();
  };
  const move = (list: UsmStepDto[], from: number, to: number) => {
    if (!persona) return;
    const ids = list.map((s) => s.id);
    const [moved] = ids.splice(from, 1);
    if (!moved) return;
    ids.splice(to, 0, moved);
    setReorderError(null);
    // The hook reorders the cards at once (numbers 1..N follow) and restores them if the server refuses.
    reorder.mutate(
      { projectId: persona.projectId, personaId: persona.id, stepIds: ids },
      { onError: (e) => setReorderError(e.message) },
    );
  };
  // The modal reads the live step, so ticking a feature updates the card behind it without a reset.
  const openStep = steps.data?.find((s) => s.id === openId);

  return (
    <>
      <PageHeader
        title="User Story Mapping (USM)"
        subtitle="Pick a user, lay out their steps from start to finish, and list the features each step needs."
        actions={
          canAdd && !readOnly && persona ? (
            <Button onClick={() => startAdd(undefined)}>Add step</Button>
          ) : null
        }
      />
      <Group mb="md" align="flex-end" wrap="wrap">
        <Select
          label="Project"
          w={220}
          allowDeselect={false}
          placeholder="Choose a project"
          data={[
            { value: "all", label: "All projects" },
            ...(allProjects.data ?? [])
              .filter((p) => !p.archivedAt)
              .map((p) => ({ value: p.id, label: p.name })),
          ]}
          value={isAll ? "all" : (project?.id ?? null)}
          onChange={(v) => setParam("project", v)}
        />
        {project && canAdd && !readOnly ? (
          <AddUser projectId={project.id} onAdded={(id) => setParam("user", id)} />
        ) : null}
        {isAll ? (
          <Button variant="default" disabled title="Select a specific project to add a user">
            Add user
          </Button>
        ) : null}
      </Group>
      {!isAll && !project && !allProjects.isLoading ? (
        <Text c="dimmed">You are not assigned to a project yet.</Text>
      ) : (
        <QueryState
          query={personas}
          isEmpty={(d) => d.length === 0}
          empty="No users yet. Add one to start mapping their journey."
        >
          {(list) => (
            <Stack gap="md">
              <Group gap="xs" role="tablist" aria-label="Users">
                {list.map((p) => (
                  <Button
                    key={p.id}
                    role="tab"
                    aria-selected={p.id === persona?.id}
                    size="compact-sm"
                    variant={p.id === persona?.id ? "light" : "default"}
                    onClick={() => setParam("user", p.id)}
                  >
                    {isAll && p.projectName ? `${p.name} · ${p.projectName}` : p.name}
                  </Button>
                ))}
              </Group>
              <QueryState
                query={steps}
                isEmpty={(d) => d.length === 0}
                empty={"No steps yet. Add the first step this user takes."}
              >
                {(data) => (
                  <Stack gap="xs">
                    {reorderError ? (
                      <Alert color="coral" title="Could not reorder the steps" role="alert">
                        {reorderError}
                      </Alert>
                    ) : null}
                    <StepTrack
                      steps={data}
                      today={today}
                      canEdit={canAdd && !readOnly}
                      onOpen={setOpenId}
                      onMove={(from, to) => move(data, from, to)}
                      onInsert={startAdd}
                    />
                  </Stack>
                )}
              </QueryState>
            </Stack>
          )}
        </QueryState>
      )}
      <UsmStepModal
        step={openStep}
        opened={!!openStep}
        onClose={() => setOpenId(null)}
        canEdit={canAdd && !readOnly}
        canDelete={isPm && !readOnly}
        canDeleteStep={!readOnly}
        canTick={!readOnly}
      />
      {persona ? (
        <AddStepModal
          key={`${addOpen}-${insertAt}-${persona.id}`}
          opened={addOpen}
          onClose={addModal.close}
          projectId={persona.projectId}
          personaId={persona.id}
          insertAtIndex={insertAt}
        />
      ) : null}
    </>
  );
}
