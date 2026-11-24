import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Group,
  PasswordInput,
  Select,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { zod4Resolver } from "mantine-form-zod-resolver";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ENUM_LABELS,
  MIN_PASSWORD_LENGTH,
  USER_ROLES,
  createUserSchema,
  type ChecklistKind,
  type ChecklistTemplateDto,
  type UpdateUserInput,
} from "@myapp/shared";
import {
  useCreateTemplate,
  useCreateUser,
  useCurrentProject,
  useDeleteUser,
  useOverrides,
  useTemplates,
  useUpdateProject,
  useUpdateTemplate,
  useUpdateUser,
  useUsers,
} from "../api/hooks";
import { useAuth, useIsPm } from "../auth";
import { PageHeader, QueryState, fmtDateTime, toast } from "../components/ui";
import { SideModal } from "../components/SideModal";

export function SettingsPage() {
  const isPm = useIsPm();
  const [params, setParams] = useSearchParams();
  if (!isPm) {
    return (
      <Alert color="coral" title="Project managers only">
        Settings are only available to project managers.
      </Alert>
    );
  }
  return (
    <>
      <PageHeader variant="settings" title="Settings" />
      <Tabs
        value={params.get("tab") ?? "users"}
        onChange={(v) => {
          const next = new URLSearchParams(params);
          if (v) next.set("tab", v);
          setParams(next, { replace: true });
        }}
      >
        <Tabs.List mb="md">
          <Tabs.Tab value="users">Users</Tabs.Tab>
          <Tabs.Tab value="checklists">Checklists</Tabs.Tab>
          <Tabs.Tab value="project">Project</Tabs.Tab>
          <Tabs.Tab value="overrides">Overrides</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="users">
          <UsersPanel />
        </Tabs.Panel>
        <Tabs.Panel value="checklists">
          <ChecklistsPanel />
        </Tabs.Panel>
        <Tabs.Panel value="project">
          <ProjectPanel />
        </Tabs.Panel>
        <Tabs.Panel value="overrides">
          <OverridesPanel />
        </Tabs.Panel>
      </Tabs>
    </>
  );
}

// ------------------------------------------------------------ users
function UsersPanel() {
  const me = useAuth();
  const users = useUsers();
  const create = useCreateUser();
  const update = useUpdateUser();
  const [opened, { open, close }] = useDisclosure();
  const [resetFor, setResetFor] = useState<{ id: string; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const remove = useDeleteUser();
  const [editFor, setEditFor] = useState<{
    id: string;
    name: string;
    email: string;
    role: (typeof USER_ROLES)[number];
  } | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<(typeof USER_ROLES)[number]>("team_member");
  const [editPassword, setEditPassword] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const form = useForm({
    initialValues: {
      email: "",
      fullName: "",
      password: "",
      role: "team_member" as (typeof USER_ROLES)[number],
    },
    validate: zod4Resolver(createUserSchema),
  });
  return (
    <Stack>
      <Group justify="flex-end" className="side-modal-footer">
        <Button onClick={open}>New user</Button>
      </Group>
      <QueryState query={users} isEmpty={(d) => d.length === 0}>
        {(items) => (
          <Table.ScrollContainer minWidth={640}>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Role</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {items.map((u) => (
                  <Table.Tr key={u.id}>
                    <Table.Td>{u.fullName}</Table.Td>
                    <Table.Td>{u.email}</Table.Td>
                    <Table.Td>
                      <Select
                        aria-label={`Role of ${u.fullName}`}
                        size="xs"
                        w={160}
                        allowDeselect={false}
                        disabled={u.id === me.id}
                        value={u.role}
                        data={USER_ROLES.map((r) => ({ value: r, label: ENUM_LABELS.role[r] }))}
                        onChange={(v) =>
                          v &&
                          update.mutate(
                            { id: u.id, patch: { role: v as (typeof USER_ROLES)[number] } },
                            { onError: (e) => toast.error(e.message) },
                          )
                        }
                      />
                    </Table.Td>
                    <Table.Td>
                      {u.isActive ? (
                        <Badge color="sea" variant="light">
                          Active
                        </Badge>
                      ) : (
                        <Badge color="navy">Inactive</Badge>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" justify="flex-end">
                        <Button
                          size="compact-xs"
                          variant="default"
                          onClick={() => {
                            setEditFor({
                              id: u.id,
                              name: u.fullName,
                              email: u.email,
                              role: u.role,
                            });
                            setEditName(u.fullName);
                            setEditEmail(u.email);
                            setEditRole(u.role);
                            setEditPassword("");
                            setEditError(null);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="compact-xs"
                          variant="default"
                          onClick={() => setResetFor({ id: u.id, name: u.fullName })}
                        >
                          Reset password
                        </Button>
                        {u.id !== me.id ? (
                          <Button
                            size="compact-xs"
                            variant="subtle"
                            color={u.isActive ? "red" : "blue"}
                            onClick={() =>
                              update.mutate(
                                { id: u.id, patch: { isActive: !u.isActive } },
                                { onError: (e) => toast.error(e.message) },
                              )
                            }
                          >
                            {u.isActive ? "Deactivate" : "Reactivate"}
                          </Button>
                        ) : null}
                        {u.id !== me.id ? (
                          <Button
                            size="compact-xs"
                            variant="subtle"
                            color="coral"
                            loading={remove.isPending && remove.variables === u.id}
                            onClick={() =>
                              window.confirm(
                                `Delete ${u.fullName}? This cannot be undone. Deactivate instead if they have recorded work.`,
                              ) &&
                              remove.mutate(u.id, {
                                onSuccess: () => toast.ok("User deleted"),
                                onError: (e) => toast.error(e.message),
                              })
                            }
                          >
                            Delete
                          </Button>
                        ) : null}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </QueryState>

      <SideModal opened={opened} onClose={close} title="New user">
        <form
          onSubmit={form.onSubmit((v) =>
            create.mutate(v, {
              onSuccess: () => {
                toast.ok("User created");
                form.reset();
                close();
              },
              onError: (e) => toast.error(e.message),
            }),
          )}
        >
          <Stack>
            <TextInput label="Full name" data-autofocus {...form.getInputProps("fullName")} />
            <TextInput label="Email" {...form.getInputProps("email")} />
            <PasswordInput
              label="Temporary password"
              description="At least 6 characters"
              {...form.getInputProps("password")}
            />
            <Select
              label="Role"
              allowDeselect={false}
              data={USER_ROLES.map((r) => ({ value: r, label: ENUM_LABELS.role[r] }))}
              {...form.getInputProps("role")}
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

      <SideModal opened={!!editFor} onClose={() => setEditFor(null)} title="Edit member">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const name = editName.trim();
            if (!editFor) return;
            const email = editEmail.trim().toLowerCase();
            if (!name) {
              setEditError("Name is required");
              return;
            }
            if (!/^\S+@\S+\.\S+$/.test(email)) {
              setEditError("Enter a valid email");
              return;
            }
            if (editPassword && editPassword.length < MIN_PASSWORD_LENGTH) {
              setEditError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
              return;
            }
            // Only changed fields are sent; a blank password leaves it unchanged.
            const patch: UpdateUserInput = {
              ...(name !== editFor.name ? { fullName: name } : {}),
              ...(email !== editFor.email ? { email } : {}),
              ...(editRole !== editFor.role ? { role: editRole } : {}),
              ...(editPassword ? { password: editPassword } : {}),
            };
            if (Object.keys(patch).length === 0) {
              setEditFor(null);
              return;
            }
            update.mutate(
              { id: editFor.id, patch },
              {
                onSuccess: () => {
                  toast.ok("Member updated");
                  setEditFor(null);
                },
                onError: (err) => setEditError(err.message),
              },
            );
          }}
        >
          <Stack>
            <TextInput
              label="Name"
              data-autofocus
              value={editName}
              error={editError}
              maxLength={120}
              onChange={(e) => {
                setEditName(e.currentTarget.value);
                setEditError(null);
              }}
            />
            <TextInput
              label="Email"
              value={editEmail}
              maxLength={254}
              onChange={(e) => {
                setEditEmail(e.currentTarget.value);
                setEditError(null);
              }}
            />
            <Select
              label="Role"
              allowDeselect={false}
              disabled={editFor?.id === me.id}
              description={editFor?.id === me.id ? "You cannot change your own role" : undefined}
              value={editRole}
              data={USER_ROLES.map((r) => ({ value: r, label: ENUM_LABELS.role[r] }))}
              onChange={(v) => v && setEditRole(v as (typeof USER_ROLES)[number])}
            />
            <PasswordInput
              label="New password"
              description="Leave blank to keep the current password. Changing it signs that user out."
              autoComplete="new-password"
              value={editPassword}
              onChange={(e) => {
                setEditPassword(e.currentTarget.value);
                setEditError(null);
              }}
            />
            <Group justify="flex-end" className="side-modal-footer">
              <Button variant="default" onClick={() => setEditFor(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={update.isPending}>
                Save
              </Button>
            </Group>
          </Stack>
        </form>
      </SideModal>

      <SideModal
        opened={!!resetFor}
        onClose={() => {
          setResetFor(null);
          setNewPassword("");
        }}
        title={`Reset password for ${resetFor?.name ?? ""}`}
      >
        <Stack>
          <Text size="sm" c="dimmed">
            Their current sessions end immediately.
          </Text>
          <PasswordInput
            label="New password"
            description="At least 6 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.currentTarget.value)}
          />
          <Group justify="flex-end" className="side-modal-footer">
            <Button
              disabled={newPassword.length < MIN_PASSWORD_LENGTH}
              loading={update.isPending}
              onClick={() =>
                resetFor &&
                update.mutate(
                  { id: resetFor.id, patch: { password: newPassword } },
                  {
                    onSuccess: () => {
                      toast.ok("Password reset");
                      setResetFor(null);
                      setNewPassword("");
                    },
                    onError: (e) => toast.error(e.message),
                  },
                )
              }
            >
              Reset password
            </Button>
          </Group>
        </Stack>
      </SideModal>
    </Stack>
  );
}

// ------------------------------------------------------------ checklists
function ChecklistsPanel() {
  const { project } = useCurrentProject();
  const templates = useTemplates(project?.id);
  return (
    <QueryState query={templates}>
      {(items) => (
        <Stack gap="lg">
          {project ? (
            <>
              <TemplateList
                projectId={project.id}
                kind="done"
                title="Definition of Done (activities)"
                items={items}
              />
              <TemplateList
                projectId={project.id}
                kind="ready"
                title="Definition of Ready (stories, used by a later phase)"
                items={items}
              />
            </>
          ) : null}
        </Stack>
      )}
    </QueryState>
  );
}

function TemplateList({
  projectId,
  kind,
  title,
  items,
}: {
  projectId: string;
  kind: ChecklistKind;
  title: string;
  items: ChecklistTemplateDto[];
}) {
  const create = useCreateTemplate(projectId);
  const update = useUpdateTemplate();
  const [label, setLabel] = useState("");
  const list = items.filter((t) => t.kind === kind).sort((a, b) => a.position - b.position);
  const move = (i: number, delta: -1 | 1) => {
    const a = list[i];
    const b = list[i + delta];
    if (!a || !b) return;
    update.mutate({ id: a.id, patch: { position: b.position } });
    update.mutate({ id: b.id, patch: { position: a.position } });
  };
  return (
    <Card withBorder>
      <Title order={4} mb="xs">
        {title}
      </Title>
      <Stack gap="xs">
        {list.length === 0 ? (
          <Text size="sm" c="dimmed">
            No items yet.
          </Text>
        ) : null}
        {list.map((t, i) => (
          <Group key={t.id} justify="space-between" wrap="nowrap">
            <TextInput
              aria-label="Checklist item"
              defaultValue={t.label}
              disabled={!t.isActive}
              style={{ flex: 1 }}
              onBlur={(e) => {
                const v = e.currentTarget.value.trim();
                if (v && v !== t.label)
                  update.mutate(
                    { id: t.id, patch: { label: v } },
                    { onError: (err) => toast.error(err.message) },
                  );
              }}
            />
            <Group gap={4} wrap="nowrap">
              <ActionIcon
                variant="default"
                aria-label="Move up"
                disabled={i === 0}
                onClick={() => move(i, -1)}
              >
                ↑
              </ActionIcon>
              <ActionIcon
                variant="default"
                aria-label="Move down"
                disabled={i === list.length - 1}
                onClick={() => move(i, 1)}
              >
                ↓
              </ActionIcon>
              <Checkbox
                label="Active"
                checked={t.isActive}
                onChange={(e) =>
                  update.mutate({ id: t.id, patch: { isActive: e.currentTarget.checked } })
                }
              />
            </Group>
          </Group>
        ))}
        <Group align="flex-end">
          <TextInput
            label="Add an item"
            value={label}
            onChange={(e) => setLabel(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Button
            disabled={!label.trim()}
            loading={create.isPending}
            onClick={() =>
              create.mutate(
                { kind, label: label.trim() },
                { onSuccess: () => setLabel(""), onError: (e) => toast.error(e.message) },
              )
            }
          >
            Add
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}

// ------------------------------------------------------------ project
function ProjectPanel() {
  const { project } = useCurrentProject();
  const update = useUpdateProject();
  if (!project) return <Text c="dimmed">No open project.</Text>;
  return (
    <Card withBorder maw={480}>
      <Stack>
        <Title order={4}>{project.name}</Title>
        <Group>
          <Button
            variant="light"
            color="coral"
            onClick={() =>
              window.confirm(`Archive ${project.name}? It becomes read-only.`) &&
              update.mutate(
                { id: project.id, patch: { archived: true } },
                { onError: (e) => toast.error(e.message) },
              )
            }
          >
            Archive project
          </Button>
        </Group>
        <Text size="sm" c="dimmed">
          Releases are managed on the project's Releases tab.
        </Text>
      </Stack>
    </Card>
  );
}

// ------------------------------------------------------------ overrides
function OverridesPanel() {
  const q = useOverrides();
  const users = useUsers();
  return (
    <QueryState
      query={q}
      isEmpty={(d) => d.length === 0}
      empty="No gate overrides have been recorded."
    >
      {(items) => (
        <Table.ScrollContainer minWidth={640}>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>When</Table.Th>
                <Table.Th>Gate</Table.Th>
                <Table.Th>Item</Table.Th>
                <Table.Th>Reason</Table.Th>
                <Table.Th>By</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.map((o) => (
                <Table.Tr key={o.id}>
                  <Table.Td>{fmtDateTime(o.createdAt)}</Table.Td>
                  <Table.Td>
                    {o.gate === "dod"
                      ? "Definition of Done"
                      : o.gate === "scope_change"
                        ? "Sprint scope"
                        : o.gate}
                  </Table.Td>
                  <Table.Td>{o.entityType}</Table.Td>
                  <Table.Td>{o.reason}</Table.Td>
                  <Table.Td>
                    {users.data?.find((u) => u.id === o.userId)?.fullName ?? "Someone"}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </QueryState>
  );
}
