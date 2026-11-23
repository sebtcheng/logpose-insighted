export type NavIconKey =
  | "home"
  | "history"
  | "workload"
  | "projects"
  | "ost"
  | "usm"
  | "kano"
  | "raid"
  | "settings"
  | "adminLog";

export type NavItem = {
  to: string;
  label: string;
  icon: NavIconKey;
  end?: boolean;
  pmOnly?: boolean;
};

export type NavSection = { id: string; title: string; items: NavItem[] };

export const NAV_SECTIONS: NavSection[] = [
  {
    id: "overview",
    title: "Overview",
    items: [
      { to: "/", label: "Home", icon: "home", end: true },
      { to: "/history", label: "History", icon: "history" },
      { to: "/workload", label: "Workload", icon: "workload" },
      { to: "/projects", label: "Projects", icon: "projects" },
    ],
  },
  {
    id: "tools",
    title: "Agile & Discovery",
    items: [
      { to: "/usm", label: "User Story Mapping (USM)", icon: "usm" },
      { to: "/ost", label: "Opportunity Solution Tree (OST)", icon: "ost" },
      { to: "/raid", label: "RAID Log", icon: "raid" },
      { to: "/kano", label: "KANO Request Tracker", icon: "kano" },
    ],
  },
  {
    id: "admin",
    title: "Administration",
    items: [
      { to: "/settings", label: "Settings", icon: "settings", pmOnly: true },
      { to: "/admin-log", label: "Admin Log", icon: "adminLog", pmOnly: true },
    ],
  },
];

/** Filters items by role and drops sections left with no visible items. */
export function visibleSections(isPm: boolean): NavSection[] {
  return NAV_SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((i) => !i.pmOnly || isPm),
  })).filter((s) => s.items.length > 0);
}
