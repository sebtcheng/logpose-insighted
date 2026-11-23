import {
  Alert,
  AppShell,
  Button,
  Burger,
  Group,
  Menu,
  NavLink,
  ScrollArea,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  Outlet,
  NavLink as RouterNavLink,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { ENUM_LABELS } from "@myapp/shared";
import { useExitSimulation, useLogout } from "../api/hooks";
import { useAuth, useIsPm, useSimulation } from "../auth";
import { ActivityDrawer } from "./ActivityDrawer";
import { GlobalSearch } from "./GlobalSearch";
import {
  AnchorIcon,
  CompassRoseIcon,
  NauticalWatermark,
  SailboatIcon,
  ShipsHelmIcon,
} from "./PirateIcons";
import { SimulationPicker } from "./SimulationPicker";
import { visibleSections } from "./navSections";
import { useRailExpansion } from "./useRailExpansion";

function Icon({ children, size = 20 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const ICONS = {
  home: <path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" />,
  history: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  workload: <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />,
  projects: <path d="M3 6a2 2 0 012-2h4l2 3h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z" />,
  ost: <path d="M12 3v6M12 9H5v5M12 9h7v5M3 14h4v5H3zM17 14h4v5h-4zM10 14h4v5h-4z" />,
  usm: <path d="M3 4h5v16H3zM10 4h5v10h-5zM17 4h4v6h-4z" />,
  kano: <path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.2l-5.5 3 1-6.2L3 9.6l6.2-.9z" />,
  raid: <path d="M12 3l10 18H2zM12 10v5M12 18h.01" />,
  adminLog: <path d="M9 5h10M9 12h10M9 19h10M4 5h.01M4 12h.01M4 19h.01" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
    </>
  ),
} as const;

export function Layout() {
  const [opened, { toggle, close }] = useDisclosure();
  const rail = useRailExpansion();
  const expanded = rail.expanded || opened;
  const user = useAuth();
  const isPm = useIsPm();
  const logout = useLogout();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const activityId = params.get("activity");

  const sim = useSimulation();
  const exitSim = useExitSimulation();
  const [pickerOpen, { open: openPicker, close: closePicker }] = useDisclosure(false);
  const exitSimulation = () => exitSim.mutate(undefined, { onSuccess: () => void navigate("/") });

  const sections = visibleSections(isPm);

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 64, breakpoint: "sm", collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header className="shell-header">
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group wrap="nowrap">
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
              aria-label="Toggle navigation"
              color="var(--lp-sand)"
            />
            <Group gap={6} wrap="nowrap">
              <SailboatIcon size={22} style={{ color: "var(--lp-sunshine)" }} />
              <Text fw={700} className="shell-brand">
                LogPose
              </Text>
            </Group>
          </Group>
          <div style={{ flex: 1, display: "flex", justifyContent: "center", paddingInline: 16 }}>
            <GlobalSearch />
          </div>
          <Group wrap="nowrap" gap="md">
            <Menu position="bottom-end" width={240} withinPortal>
              <Menu.Target>
                <UnstyledButton
                  aria-haspopup="menu"
                  aria-label="Account menu"
                  className="shell-account"
                  px="xs"
                  py={4}
                >
                  <Group gap={8} wrap="nowrap">
                    <div style={{ textAlign: "right" }}>
                      <Text fw={600} size="sm" lh={1.2}>
                        {user.fullName}
                      </Text>
                      <Text size="xs" lh={1.2} className="shell-role">
                        {ENUM_LABELS.role[user.role]}
                      </Text>
                    </div>
                    <span
                      className="shell-chevron"
                      style={{ display: "inline-flex", color: "var(--lp-sailcloth)" }}
                    >
                      <Icon size={14}>
                        <path d="M6 9l6 6 6-6" />
                      </Icon>
                    </span>
                  </Group>
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>
                  <Text fw={600} size="sm" c="var(--mantine-color-text)">
                    {user.fullName}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {ENUM_LABELS.role[user.role]}
                  </Text>
                </Menu.Label>
                <Menu.Divider />
                {isPm ? (
                  <Menu.Item onClick={() => void navigate("/settings")}>Settings</Menu.Item>
                ) : null}
                {sim.realIsPm && !sim.isSimulating ? (
                  <Menu.Item onClick={openPicker}>Simulate team member</Menu.Item>
                ) : null}
                {sim.isSimulating ? (
                  <Menu.Item disabled={exitSim.isPending} onClick={exitSimulation}>
                    Exit simulation
                  </Menu.Item>
                ) : null}
                <Menu.Divider />
                <Menu.Item
                  color="coral"
                  disabled={logout.isPending}
                  onClick={() =>
                    logout.mutate(undefined, {
                      onSuccess: () => {
                        qc.clear();
                        void navigate("/login");
                      },
                    })
                  }
                >
                  Sign out
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar
        className="shell-navbar"
        p="xs"
        w={expanded ? 300 : undefined}
        data-expanded={expanded ? "true" : "false"}
        {...rail.handlers}
      >
        <AppShell.Section grow component={ScrollArea}>
          <nav aria-label="Main">
            {sections.map((section, idx) => (
              <div
                key={section.id}
                role="group"
                aria-label={section.title}
                className="shell-nav-section"
                data-first={idx === 0 ? "true" : undefined}
                data-expanded={expanded ? "true" : "false"}
              >
                <div className="shell-nav-heading" aria-hidden="true">
                  {section.title}
                </div>
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    component={RouterNavLink}
                    to={item.to}
                    end={item.end}
                    label={item.label}
                    leftSection={<Icon>{ICONS[item.icon]}</Icon>}
                    title={item.label}
                    h={40}
                    styles={{
                      root: { padding: "0 10px", overflow: "hidden" },
                      body: { overflow: "hidden" },
                      label: { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
                      section: { marginInlineEnd: 12 },
                    }}
                    onClick={close}
                  />
                ))}
              </div>
            ))}
          </nav>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main style={{ position: "relative", overflow: "hidden" }}>
        <NauticalWatermark style={{ top: 12, right: 16, zIndex: 0 }}>
          <CompassRoseIcon size={180} />
        </NauticalWatermark>
        <NauticalWatermark style={{ bottom: 16, left: 24, zIndex: 0 }}>
          <AnchorIcon size={120} />
        </NauticalWatermark>
        <NauticalWatermark style={{ bottom: 24, right: 32, zIndex: 0 }}>
          <ShipsHelmIcon size={140} />
        </NauticalWatermark>
        {sim.isSimulating ? (
          <Alert color="sun" mb="md" py="xs" role="status">
            <Group justify="space-between" wrap="nowrap">
              <Text size="sm">Viewing as {user.fullName}</Text>
              <Button
                size="compact-sm"
                variant="default"
                loading={exitSim.isPending}
                onClick={exitSimulation}
              >
                Exit
              </Button>
            </Group>
          </Alert>
        ) : null}
        <SimulationPicker opened={pickerOpen} onClose={closePicker} />
        {/* Keyed by path so each page plays the entry fade; query-string changes (filters, drawers) do not replay it. */}
        <div className="shell-page" key={location.pathname}>
          <Outlet />
        </div>
        <ActivityDrawer
          activityId={activityId}
          onClose={() => {
            const next = new URLSearchParams(params);
            next.delete("activity");
            setParams(next);
          }}
        />
      </AppShell.Main>
    </AppShell>
  );
}
