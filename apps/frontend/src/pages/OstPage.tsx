import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Select,
  SimpleGrid,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  MIN_SOLUTIONS_PER_TARGET,
  type OpportunityDto,
  type OutcomeDto,
  type SolutionDto,
} from "@myapp/shared";
import {
  useCreateOpportunity,
  useCreateOutcome,
  useCreateSolution,
  useCurrentProject,
  useDeleteOpportunity,
  useDeleteOutcome,
  useDeleteSolution,
  useOstTree,
  useProjects,
  useUpdateOpportunity,
  useUpdateOutcome,
  useUpdateSolution,
  useUsers,
} from "../api/hooks";
import { useIsPm } from "../auth";
import { QuickModal, type QuickField } from "../components/QuickModal";
import { SolutionModal } from "../components/SolutionModal";
import { SolutionCheck } from "../components/SolutionCheck";
import { OstActionBar } from "../components/OstActionBar";
import { OstTable } from "../components/OstTable";
import type { OstCtx, OstDialog } from "../components/ostTypes";
import { PageHeader, QueryState, fmtDate, toast } from "../components/ui";
import { RequirementModal, stepsToDrafts } from "../components/RequirementModal";
import { ViewModeToggle } from "../components/ViewModeToggle";
import { useViewMode } from "../lib/viewMode";
import { outcomeSolutions, solutionProgress } from "../lib/ostOptimistic";
import { formToSolutionInput, solutionToForm } from "../lib/ostSolutionForm";
import { CompletionMeter } from "../components/CompletionMeter";
import { SideModal } from "../components/SideModal";

type Dialog = OstDialog;

export type { OstCtx };

/** A solution is the action under a requirement: tick it when done. */
function SolutionRow({ s, ctx }: { s: SolutionDto; ctx: OstCtx }) {
  const remove = useDeleteSolution();
  // Add and edit are open to team members (the server scopes them to their projects); deleting, ticking
  // (validating) and converting stay with the PM.
  const canEdit = !ctx.readOnly;
  const pmOnly = ctx.isPm && !ctx.readOnly;
  return (
    <div className="ost-solution" style={{ paddingLeft: "var(--mantine-spacing-md)" }}>
      <Group justify="space-between" wrap="wrap" py={4} align="flex-start">
        <div style={{ minWidth: 0, flex: 1 }}>
          <SolutionCheck solution={s} editable={canEdit} />
          {s.ownerName || s.targetDate ? (
            <Text size="xs" c="dimmed" ml={26}>
              {[
                s.ownerName ? `Owner ${s.ownerName}` : null,
                s.targetDate ? (s.sprintLabel ?? `due ${fmtDate(s.targetDate)}`) : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          ) : null}
        </div>
        {canEdit ? (
          <OstActionBar
            scope={s.code}
            workflow={
              s.convertedStoryId || !pmOnly
                ? []
                : [
                    {
                      label: "Convert to story",
                      onClick: () => ctx.openSolution(s.id),
                      hint: "Turn this solution into a user story",
                    },
                  ]
            }
            onEdit={() =>
              ctx.setDialog({ kind: "solution", opportunityId: s.opportunityId, existing: s })
            }
            onDelete={
              ctx.readOnly
                ? undefined
                : () => {
                    if (window.confirm(`Delete ${s.code}?`)) {
                      remove.mutate(s.id, { onError: (e) => toast.error(e.message) });
                    }
                  }
            }
          />
        ) : null}
      </Group>
    </div>
  );
}

function OpportunityNode({ o, ctx }: { o: OpportunityDto; ctx: OstCtx }) {
  const update = useUpdateOpportunity();
  const remove = useDeleteOpportunity();
  const solutions = ctx.tree.solutions.filter((s) => s.opportunityId === o.id);
  const thin = o.isTargeted && solutions.length < MIN_SOLUTIONS_PER_TARGET;
  // Add and edit are open to team members (the server scopes them to their projects); deleting, ticking
  // (validating) and converting stay with the PM.
  const canEdit = !ctx.readOnly;
  return (
    <Card withBorder p="sm" mb="xs">
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <div style={{ flex: 1, minWidth: 220 }}>
          <Group gap={6}>
            <Text fw={600}>{o.title}</Text>
            {o.isTargeted ? <Badge>Targeted</Badge> : null}
          </Group>
        </div>
        {canEdit ? (
          <OstActionBar
            scope="requirement"
            create={[
              {
                label: "Add solution",
                onClick: () => ctx.setDialog({ kind: "solution", opportunityId: o.id }),
              },
            ]}
            workflow={
              o.isTargeted
                ? []
                : [
                    {
                      label: "Target this",
                      hint: "Mark as the requirement to solve now",
                      onClick: () =>
                        update.mutate(
                          { id: o.id, patch: { isTargeted: true } },
                          { onError: (e) => toast.error(e.message) },
                        ),
                    },
                  ]
            }
            onEdit={() =>
              ctx.setDialog({ kind: "opportunity", outcomeId: o.outcomeId, existing: o })
            }
            onDelete={
              ctx.readOnly
                ? undefined
                : () => {
                    if (window.confirm(`Delete "${o.title}" with its solutions?`)) {
                      remove.mutate(o.id, { onError: (e) => toast.error(e.message) });
                    }
                  }
            }
          />
        ) : null}
      </Group>
      {thin ? (
        <Alert color="sun" mt="xs" p="xs">
          This is the targeted requirement but has {solutions.length} of {MIN_SOLUTIONS_PER_TARGET}{" "}
          solutions. Compare at least {MIN_SOLUTIONS_PER_TARGET} different ideas before committing.
        </Alert>
      ) : null}
      <Text size="xs" fw={700} tt="uppercase" c="dimmed" mt="xs">
        Solutions (actions)
      </Text>
      {solutions.length === 0 ? (
        <Text size="sm" c="dimmed">
          No solutions yet.
        </Text>
      ) : (
        solutions.map((s) => <SolutionRow key={s.id} s={s} ctx={ctx} />)
      )}
    </Card>
  );
}

/** The outcome, stated once: it is the side modal's header, with its own Edit and Delete. */
function OutcomeHeader({
  outcome,
  ctx,
  onDeleted,
}: {
  outcome: OutcomeDto;
  ctx: OstCtx;
  onDeleted: () => void;
}) {
  const remove = useDeleteOutcome();
  // Add and edit are open to team members (the server scopes them to their projects); deleting, ticking
  // (validating) and converting stay with the PM.
  const canEdit = !ctx.readOnly;
  return (
    <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
      <div style={{ minWidth: 0 }}>
        <Text size="xs" fw={700} tt="uppercase" c="dimmed">
          Outcome, {outcome.projectName}
        </Text>
        <Text fz={18} fw={700}>
          {outcome.title}
        </Text>
      </div>
      {canEdit ? (
        <OstActionBar
          scope="outcome"
          onEdit={() => ctx.setDialog({ kind: "outcome", existing: outcome })}
          onDelete={
            ctx.readOnly
              ? undefined
              : () => {
                  if (window.confirm(`Delete this outcome and everything under it?`)) {
                    remove.mutate(outcome.id, {
                      onSuccess: onDeleted,
                      onError: (e) => toast.error(e.message),
                    });
                  }
                }
          }
        />
      ) : null}
    </Group>
  );
}

/** Body of the side modal: requirements for this outcome, each with its solutions as the actions. */
function OutcomeDetail({ outcome, ctx }: { outcome: OutcomeDto; ctx: OstCtx }) {
  const opportunities = ctx.tree.opportunities.filter((o) => o.outcomeId === outcome.id);
  // Add and edit are open to team members (the server scopes them to their projects); deleting, ticking
  // (validating) and converting stay with the PM.
  const canEdit = !ctx.readOnly;

  return (
    <Stack gap="xs">
      <Group justify="space-between" align="center">
        <Text size="xs" fw={700} tt="uppercase" c="dimmed">
          Requirements
        </Text>
        {canEdit ? (
          <Button
            size="compact-xs"
            variant="light"
            onClick={() => ctx.setDialog({ kind: "opportunity", outcomeId: outcome.id })}
          >
            Add requirements
          </Button>
        ) : null}
      </Group>
      {opportunities.length === 0 ? (
        <Text size="sm" c="dimmed">
          No requirements yet. Add the requirements to make this outcome a reality.
        </Text>
      ) : (
        opportunities.map((o) => <OpportunityNode key={o.id} o={o} ctx={ctx} />)
      )}
    </Stack>
  );
}

/** Compact grid card; opens the requirements and their solution actions in a slide-over. */
export function OutcomeCard({ outcome, ctx }: { outcome: OutcomeDto; ctx: OstCtx }) {
  const [opened, setOpened] = useState(false);
  const { done, total } = solutionProgress(outcomeSolutions(ctx.tree, outcome.id));
  return (
    <>
      <Card withBorder p="md" h="100%">
        <UnstyledButton
          w="100%"
          onClick={() => setOpened(true)}
          aria-label={`View steps for ${outcome.title}`}
        >
          <Text size="xs" fw={700} tt="uppercase" c="dimmed">
            Outcome, {outcome.projectName}
          </Text>
          <Text fz={16} fw={700} lineClamp={2}>
            {outcome.title}
          </Text>
          <div style={{ marginTop: "var(--mantine-spacing-sm)" }}>
            <CompletionMeter done={done} total={total} />
          </div>
          <Text size="xs" c="dimmed" mt={6}>
            View steps
          </Text>
        </UnstyledButton>
      </Card>
      <SideModal
        opened={opened}
        onClose={() => setOpened(false)}
        title={<OutcomeHeader outcome={outcome} ctx={ctx} onDeleted={() => setOpened(false)} />}
        size="lg"
      >
        <OutcomeDetail outcome={outcome} ctx={ctx} />
      </SideModal>
    </>
  );
}

export function OstPage() {
  const isPm = useIsPm();
  const [viewMode, setViewMode] = useViewMode("card");
  const [params, setParams] = useSearchParams();
  // PMs see every project's outcomes by default; others see one project at a time.
  const scope = params.get("project") ?? (isPm ? "all" : null);
  const isAll = scope === "all";
  const { project } = useCurrentProject(isAll ? null : scope);
  const setScope = (v: string | null) => {
    const next = new URLSearchParams(params);
    if (v) next.set("project", v);
    else next.delete("project");
    setParams(next, { replace: true });
  };
  const users = useUsers();
  const projects = useProjects();
  const query = useOstTree(isAll ? "all" : project?.id);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const readOnly = !project || !!project.archivedAt;

  const createOutcome = useCreateOutcome(project?.id ?? "");
  const updateOutcome = useUpdateOutcome();
  const createOpp = useCreateOpportunity();
  const updateOpp = useUpdateOpportunity();
  const createSol = useCreateSolution();
  const updateSol = useUpdateSolution();
  const close = () => setDialog(null);
  const done = { onSuccess: close, onError: (e: Error) => toast.error(e.message) };

  const projectOptions = (projects.data ?? [])
    .filter((p) => !p.archivedAt)
    .map((p) => ({ value: p.id, label: p.name }));
  const outcomeFields: QuickField[] = [
    { key: "title", label: "Business outcome", required: true },
    { key: "description", label: "Description", kind: "textarea" },
    // An outcome stays in the project it was created in, so the choice only applies when adding.
    ...(dialog?.kind === "outcome" && dialog.existing
      ? []
      : [{ key: "projectId", label: "Project", kind: "select" as const, options: projectOptions }]),
  ];
  const solFields: QuickField[] = [
    { key: "title", label: "Potential solution", required: true },
    { key: "sprintKey", label: "Sprint", kind: "sprint" },
    {
      key: "ownerId",
      label: "Owner",
      kind: "select",
      options: (users.data ?? [])
        .filter((u) => u.isActive)
        .map((u) => ({ value: u.id, label: u.fullName })),
    },
  ];

  return (
    <>
      <PageHeader
        variant="ost"
        title="Opportunity Solution Tree (OST)"
        subtitle="Start from an outcome, map the requirements, and compare the solutions you could take as actions."
        actions={
          !readOnly ? (
            <Button onClick={() => setDialog({ kind: "outcome" })}>Add outcome</Button>
          ) : null
        }
      />
      <Group mb="md" align="flex-end" wrap="wrap">
        <Select
          label="Project"
          allowDeselect={false}
          w={200}
          data={[...(isPm ? [{ value: "all", label: "All projects" }] : []), ...projectOptions]}
          value={isAll ? "all" : (project?.id ?? null)}
          onChange={setScope}
        />
        <div style={{ marginInlineStart: "auto" }}>
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
        </div>
      </Group>
      <QueryState
        query={query}
        isEmpty={(d) => d.outcomes.length === 0}
        empty={"No outcomes yet. Add the business outcome you want to move."}
      >
        {(tree) => {
          const ctx: OstCtx = { tree, isPm, readOnly, setDialog, openSolution: setOpenId };
          const open = tree.solutions.find((s) => s.id === openId);
          return (
            <Stack>
              {viewMode === "table" ? (
                <OstTable ctx={ctx} />
              ) : (
                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
                  {tree.outcomes.map((o) => (
                    <OutcomeCard key={o.id} outcome={o} ctx={ctx} />
                  ))}
                </SimpleGrid>
              )}
              {open ? (
                <SolutionModal
                  solution={open}
                  isPm={isPm}
                  readOnly={readOnly}
                  onClose={() => setOpenId(null)}
                />
              ) : null}
            </Stack>
          );
        }}
      </QueryState>

      {dialog?.kind === "outcome" ? (
        <QuickModal
          opened
          title={dialog.existing ? "Edit outcome" : "Add outcome"}
          fields={outcomeFields}
          pending={createOutcome.isPending || updateOutcome.isPending}
          initial={
            dialog.existing
              ? {
                  title: dialog.existing.title,
                  description: dialog.existing.description ?? "",
                }
              : { projectId: project?.id ?? "" }
          }
          onClose={close}
          onSubmit={(v) => {
            const input = {
              title: v.title ?? "",
              description: v.description || null,
            };
            if (dialog.existing)
              updateOutcome.mutate({ id: dialog.existing.id, patch: input }, done);
            else
              createOutcome.mutate(
                { ...input, projectId: v.projectId || undefined },
                {
                  ...done,
                  // Show the project the outcome landed in, otherwise it looks like nothing happened.
                  onSuccess: () => {
                    if (!isAll && v.projectId) setScope(v.projectId);
                    close();
                  },
                },
              );
          }}
        />
      ) : null}
      {dialog?.kind === "opportunity" ? (
        <RequirementModal
          title={dialog.existing ? "Edit requirement" : "Add requirements"}
          initialTitle={dialog.existing?.title}
          initialSteps={
            dialog.existing
              ? stepsToDrafts(
                  query.data?.solutions.filter((s) => s.opportunityId === dialog.existing?.id) ??
                    [],
                )
              : []
          }
          staffOptions={(users.data ?? [])
            .filter((u) => u.isActive)
            .map((u) => ({ value: u.id, label: u.fullName }))}
          pending={createOpp.isPending || updateOpp.isPending}
          onClose={close}
          onSubmit={(input) => {
            if (dialog.existing) updateOpp.mutate({ id: dialog.existing.id, patch: input }, done);
            else createOpp.mutate({ outcomeId: dialog.outcomeId, input }, done);
          }}
        />
      ) : null}
      {dialog?.kind === "solution" ? (
        <QuickModal
          opened
          title={dialog.existing ? "Edit solution" : "Add solution"}
          fields={solFields}
          pending={createSol.isPending || updateSol.isPending}
          initial={dialog.existing ? solutionToForm(dialog.existing) : undefined}
          onClose={close}
          onSubmit={(v) => {
            // The form shows a Sprint field, so the body must carry it (it was silently dropped before).
            const input = formToSolutionInput(v);
            if (dialog.existing) updateSol.mutate({ id: dialog.existing.id, patch: input }, done);
            else createSol.mutate({ opportunityId: dialog.opportunityId, input }, done);
          }}
        />
      ) : null}
    </>
  );
}
