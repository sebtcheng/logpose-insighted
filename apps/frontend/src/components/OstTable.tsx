import { Badge, Group, Table, Text } from "@mantine/core";
import {
  MIN_SOLUTIONS_PER_TARGET,
  VALIDATION_LABELS,
  type OpportunityDto,
  type OutcomeDto,
  type SolutionDto,
} from "@myapp/shared";
import {
  useDeleteOpportunity,
  useDeleteOutcome,
  useDeleteSolution,
  useUpdateOpportunity,
} from "../api/hooks";
import type { OstCtx } from "./ostTypes";
import { SolutionCheck } from "./SolutionCheck";
import { OstActionBar } from "./OstActionBar";
import { VALIDATION_COLOR } from "./SolutionModal";
import { toast } from "./ui";

const DASH = "—";

function OutcomeRow({ o, ctx }: { o: OutcomeDto; ctx: OstCtx }) {
  const remove = useDeleteOutcome();
  // Add and edit are open to team members; deleting, ticking (validating) and converting stay with the PM.
  const canEdit = !ctx.readOnly;
  const pmOnly = ctx.isPm && !ctx.readOnly;
  return (
    <Table.Tr>
      <Table.Td>
        <Text size="xs" fw={700} tt="uppercase" c="dimmed">
          Outcome
        </Text>
      </Table.Td>
      <Table.Td>
        <Text fw={700}>{o.title}</Text>
      </Table.Td>
      <Table.Td>{o.projectName}</Table.Td>
      <Table.Td>
        {o.description ? (
          <Text size="xs" c="dimmed">
            {o.description}
          </Text>
        ) : null}
      </Table.Td>
      <Table.Td>{DASH}</Table.Td>
      <Table.Td>{DASH}</Table.Td>
      <Table.Td>{DASH}</Table.Td>
      <Table.Td>
        {canEdit ? (
          <OstActionBar
            scope="outcome"
            create={[
              {
                label: "Add requirements",
                onClick: () => ctx.setDialog({ kind: "opportunity", outcomeId: o.id }),
              },
            ]}
            onEdit={() => ctx.setDialog({ kind: "outcome", existing: o })}
            onDelete={
              !pmOnly
                ? undefined
                : () => {
                    if (window.confirm(`Delete this outcome and everything under it?`)) {
                      remove.mutate(o.id, { onError: (e) => toast.error(e.message) });
                    }
                  }
            }
          />
        ) : null}
      </Table.Td>
    </Table.Tr>
  );
}

function OpportunityRow({ o, ctx }: { o: OpportunityDto; ctx: OstCtx }) {
  const update = useUpdateOpportunity();
  const remove = useDeleteOpportunity();
  // Add and edit are open to team members; deleting, ticking (validating) and converting stay with the PM.
  const canEdit = !ctx.readOnly;
  const pmOnly = ctx.isPm && !ctx.readOnly;
  const count = ctx.tree.solutions.filter((s) => s.opportunityId === o.id).length;
  const thin = o.isTargeted && count < MIN_SOLUTIONS_PER_TARGET;
  return (
    <Table.Tr>
      <Table.Td>
        <Text size="xs" fw={700} tt="uppercase" c="dimmed">
          Requirement
        </Text>
      </Table.Td>
      <Table.Td pl={`calc(var(--mantine-spacing-xs) + 16px)`}>
        <Text fw={600}>{o.title}</Text>
      </Table.Td>
      <Table.Td>{DASH}</Table.Td>
      <Table.Td>{DASH}</Table.Td>
      <Table.Td>{DASH}</Table.Td>
      <Table.Td>
        <Text
          size="xs"
          fw={700}
          tt="uppercase"
          ff="var(--font-mono)"
          c={thin ? "yellow.8" : "dimmed"}
        >
          {count}/{MIN_SOLUTIONS_PER_TARGET} solutions
        </Text>
      </Table.Td>
      <Table.Td>{o.isTargeted ? <Badge>Targeted</Badge> : DASH}</Table.Td>
      <Table.Td>
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
              !pmOnly
                ? undefined
                : () => {
                    if (window.confirm(`Delete "${o.title}" with its solutions?`)) {
                      remove.mutate(o.id, { onError: (e) => toast.error(e.message) });
                    }
                  }
            }
          />
        ) : null}
      </Table.Td>
    </Table.Tr>
  );
}

function SolutionTableRow({ s, ctx }: { s: SolutionDto; ctx: OstCtx }) {
  const remove = useDeleteSolution();
  // Add and edit are open to team members; deleting, ticking (validating) and converting stay with the PM.
  const canEdit = !ctx.readOnly;
  const pmOnly = ctx.isPm && !ctx.readOnly;
  return (
    <Table.Tr>
      <Table.Td>
        <Text size="xs" fw={700} tt="uppercase" c="dimmed">
          Solution
        </Text>
      </Table.Td>
      <Table.Td pl={`calc(var(--mantine-spacing-xs) + 32px)`}>
        <Text size="sm">
          <Text span size="xs" fw={700} ff="var(--font-mono)">
            {s.code}
          </Text>{" "}
          {s.title}
        </Text>
      </Table.Td>
      <Table.Td>{DASH}</Table.Td>
      <Table.Td>
        <SolutionCheck solution={s} editable={canEdit} />
      </Table.Td>
      <Table.Td>{s.ownerName ?? DASH}</Table.Td>
      <Table.Td>
        <Text size="xs" ff="var(--font-mono)">
          {s.validationStatus === "validated" ? "1/1 validated" : "0/1 validated"}
        </Text>
      </Table.Td>
      <Table.Td>
        <Group gap={4} wrap="nowrap">
          <Badge size="sm" variant="light" color={VALIDATION_COLOR[s.validationStatus]}>
            {VALIDATION_LABELS[s.validationStatus]}
          </Badge>
          {s.convertedStoryCode ? (
            <Badge size="sm" variant="outline">
              {s.convertedStoryCode}
            </Badge>
          ) : null}
        </Group>
      </Table.Td>
      <Table.Td>
        <OstActionBar
          scope={s.code}
          workflow={
            pmOnly && !s.convertedStoryId
              ? [
                  {
                    label: "Convert to story",
                    hint: "Turn this solution into a user story",
                    onClick: () => ctx.openSolution(s.id),
                  },
                ]
              : []
          }
          onEdit={
            canEdit
              ? () =>
                  ctx.setDialog({ kind: "solution", opportunityId: s.opportunityId, existing: s })
              : undefined
          }
          onDelete={
            pmOnly
              ? () => {
                  if (window.confirm(`Delete ${s.code}?`)) {
                    remove.mutate(s.id, { onError: (e) => toast.error(e.message) });
                  }
                }
              : undefined
          }
        />
      </Table.Td>
    </Table.Tr>
  );
}

function OpportunityBranch({ o, ctx }: { o: OpportunityDto; ctx: OstCtx }) {
  const solutions = ctx.tree.solutions.filter((s) => s.opportunityId === o.id);
  return (
    <>
      <OpportunityRow o={o} ctx={ctx} />
      {solutions.map((s) => (
        <SolutionTableRow key={s.id} s={s} ctx={ctx} />
      ))}
    </>
  );
}

function OutcomeBranch({ o, ctx }: { o: OutcomeDto; ctx: OstCtx }) {
  const roots = ctx.tree.opportunities.filter((x) => x.outcomeId === o.id);
  return (
    <>
      <OutcomeRow o={o} ctx={ctx} />
      {roots.map((r) => (
        <OpportunityBranch key={r.id} o={r} ctx={ctx} />
      ))}
    </>
  );
}

/** The same tree as the card view, flattened into one table. */
export function OstTable({ ctx }: { ctx: OstCtx }) {
  return (
    <Table.ScrollContainer minWidth={1280}>
      <Table verticalSpacing="xs" highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Level</Table.Th>
            <Table.Th miw={220}>Item</Table.Th>
            <Table.Th>Project</Table.Th>
            <Table.Th miw={240}>Details</Table.Th>
            <Table.Th>Owner</Table.Th>
            <Table.Th>Progress / Target</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th ta="right" miw={260}>
              Actions
            </Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {ctx.tree.outcomes.map((o) => (
            <OutcomeBranch key={o.id} o={o} ctx={ctx} />
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
