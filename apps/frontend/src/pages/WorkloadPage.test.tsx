// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkItem, WorkMemberRollup, WorkloadResponse } from "@myapp/shared";

vi.mock("../api/client", () => ({
  api: { patch: vi.fn(), post: vi.fn(), delete: vi.fn(), get: vi.fn(), put: vi.fn() },
  errorMessage: (e: unknown) => String(e),
  ApiClientError: class extends Error {},
}));
const auth = vi.hoisted(() => ({ role: "pm" }));
vi.mock("../auth", async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  useAuth: () => ({ id: auth.role === "pm" ? "pm1" : "u1", role: auth.role }),
  useIsPm: () => auth.role === "pm",
}));
import { api } from "../api/client";
import { WorkloadPage } from "./WorkloadPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const item = (
  id: string,
  sourceModule: WorkItem["sourceModule"],
  over: Partial<WorkItem> = {},
): WorkItem => ({
  id,
  sourceModule,
  itemKind: "step",
  title: `${id} title`,
  parentTitle: `${id} parent`,
  parentId: `${id}-parent`,
  projectId: "p1",
  subprojectId: null,
  assigneeId: "u1",
  assigneeName: "Klein",
  dueDate: "2026-11-20",
  isCompleted: false,
  completedAt: null,
  scheduleStatus: "ongoing_on_time",
  pmApproval: "APPROVED",
  ...over,
});

const klein = [
  item("ost-1", "ost"),
  item("usm-1", "user_story"),
  item("kano-1", "kano", { scheduleStatus: "delayed", dueDate: "2026-11-02" }),
  item("raid-1", "raid", { isCompleted: true, scheduleStatus: "completed_on_time" }),
];
const member = (over: Partial<WorkMemberRollup>): WorkMemberRollup => ({
  userId: "u1",
  fullName: "Klein",
  total: 4,
  completed: 1,
  incomplete: 3,
  completionRate: 25,
  ongoing: 2,
  onTime: 3,
  delayed: 1,
  unscheduled: 0,
  active: 3,
  byModule: { project: 0, ost: 1, kano: 1, user_story: 1, raid: 1 },
  items: klein,
  ...over,
});

const row = (userId: string, fullName: string, owned = 0, memberCount = 0) => ({
  userId,
  fullName,
  ownedProjectsCount: owned,
  teamMemberProjectsCount: memberCount,
  dueThisWeek: 3,
});
// No active sprint anywhere; Klein has tagged OST, USM, Kano and RAID work, Clea has none, one item is unassigned.
const DATA: WorkloadResponse = {
  items: [row("u2", "Clea"), row("u1", "Klein", 2, 3)],
  members: [
    member({
      userId: "u2",
      fullName: "Clea",
      total: 0,
      ongoing: 0,
      onTime: 0,
      delayed: 0,
      completed: 0,
      items: [],
    }),
    member({}),
    member({
      userId: null,
      fullName: "Unassigned",
      total: 1,
      ongoing: 1,
      onTime: 1,
      delayed: 0,
      completed: 0,
      items: [item("orphan-1", "ost", { assigneeId: null, assigneeName: null })],
    }),
  ],
};

const cleanups: Array<() => void> = [];
beforeAll(() => {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: false,
    media: q,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = () => undefined;
      unobserve = () => undefined;
      disconnect = () => undefined;
    },
  );
  Element.prototype.scrollIntoView = () => undefined;
});
beforeEach(() => {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === "/projects")
      return Promise.resolve({ items: [{ id: "p1", name: "Infra", archivedAt: null }] });
    if (url === "/workload") return Promise.resolve(DATA);
    return Promise.resolve({ items: [] });
  });
});
afterEach(() => {
  while (cleanups.length) cleanups.pop()?.();
  vi.clearAllMocks();
});

const flush = async () => {
  for (let i = 0; i < 4; i++)
    await act(async () => void (await new Promise((r) => setTimeout(r, 0))));
};
async function mount() {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(() => {
    root.render(
      createElement(
        MemoryRouter,
        null,
        createElement(
          QueryClientProvider,
          { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
          createElement(MantineProvider, null, createElement(WorkloadPage)),
        ),
      ),
    );
    return Promise.resolve();
  });
  await flush();
  cleanups.push(() => {
    act(() => root.unmount());
    el.remove();
  });
}

const headers = () =>
  [...(document.querySelector("table")?.querySelectorAll(":scope > thead th") ?? [])].map((h) =>
    h.textContent?.trim(),
  );
const cells = (name: string) => {
  const tr = [...document.querySelectorAll("tbody tr")].find((r) =>
    r.querySelector("td")?.textContent?.includes(name),
  );
  return [...(tr?.querySelectorAll("td") ?? [])].map((c) => c.textContent?.trim());
};

describe("Workload page", () => {
  it("binds every cell to its column: Owner and Team member sit right after Person", async () => {
    await mount();
    const h = headers();
    expect(h).toEqual([
      "Person↕⧗",
      "Owner↕⧗",
      "Team member↕⧗",
      "Due this week↕⧗",
      "All tasks↕⧗",
      "Ongoing↕⧗",
      "On time↕⧗",
      "Delayed↕⧗",
      "Completed↕⧗",
    ]);
    for (const gone of ["In progress / limit", "Blocked", "Waiting on dependency", "Active sprint"])
      expect(h).not.toContain(gone);
    expect(document.body.textContent).not.toContain("No active sprint");
    expect(document.body.textContent).not.toContain("over limit");
    const c = cells("Klein");
    expect(c).toHaveLength(9);
    // Klein owns 2 projects and is a team member on 3.
    expect(c[h.indexOf("Owner↕⧗")]).toBe("2");
    expect(c[h.indexOf("Team member↕⧗")]).toBe("3");
    expect(c[h.indexOf("Due this week↕⧗")]).toBe("3");
    expect(c[h.indexOf("All tasks↕⧗")]).toBe("4");
    expect(c[h.indexOf("Ongoing↕⧗")]).toBe("2");
    expect(c[h.indexOf("On time↕⧗")]).toBe("3");
    expect(c[h.indexOf("Delayed↕⧗")]).toBe("1");
    expect(c[h.indexOf("Completed↕⧗")]).toBe("1");
  });

  it("shows zeros for a person with nothing tagged and keeps the Unassigned row aligned", async () => {
    await mount();
    const h = headers();
    const clea = cells("Clea");
    expect(clea[h.indexOf("All tasks↕⧗")]).toBe("0");
    const un = cells("Unassigned");
    // Person, Owner, Team member, an empty Due this week cell, then the five metrics.
    expect(un).toHaveLength(9);
    expect(un[0]).toContain("Unassigned");
    expect(un[1]).toBe("—");
    expect(un[2]).toBe("—");
    expect(un[4]).toBe("1");
    const spans = [...document.querySelectorAll("tbody td[colspan]")].map((c) =>
      c.getAttribute("colspan"),
    );
    expect(spans.filter((s) => s === "9").length).toBeGreaterThan(0);
    expect(spans).not.toContain("7");
  });

  it("expands a person to every assigned item across the modules, with module pill and schedule", async () => {
    await mount();
    const toggle = [...document.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Klein"),
    );
    expect(toggle).toBeTruthy();
    await act(() => {
      toggle!.click();
      return Promise.resolve();
    });
    await flush();
    const rows = [...document.querySelectorAll("[data-testid='work-item-row']")];
    const text = rows.map((r) => r.textContent ?? "").join("|");
    for (const t of ["ost-1 title", "usm-1 title", "kano-1 title", "raid-1 title"]) {
      expect(text).toContain(t);
    }
    for (const pill of ["OST", "User Story Map", "Kano", "RAID"]) expect(text).toContain(pill);
    expect(text).toContain("ost-1 parent");
    expect(text).toContain("Delayed");
    expect(text).toContain("Completed on time");
  });

  const expandKlein = async () => {
    const toggle = [...document.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Klein"),
    );
    await act(() => {
      toggle!.click();
      return Promise.resolve();
    });
    await flush();
  };
  const checkbox = (title: string) =>
    document.querySelector<HTMLInputElement>(`input[aria-label$="${title}"]`);

  it("puts a completion checkbox in the leftmost cell of every expanded task row", async () => {
    await mount();
    await expandKlein();
    const rows = [...document.querySelectorAll("[data-testid='work-item-row']")].filter(
      (r) =>
        r.textContent?.includes("ost-1 title") ||
        r.textContent?.includes("raid-1 title") ||
        r.textContent?.includes("usm-1 title") ||
        r.textContent?.includes("kano-1 title"),
    );
    expect(rows).toHaveLength(4);
    for (const r of rows) {
      expect(r.querySelector("td:first-child input[type='checkbox']")).toBeTruthy();
    }
    expect(checkbox("raid-1 title")?.checked).toBe(true);
    expect(checkbox("ost-1 title")?.checked).toBe(false);
  });

  it("ticks an item through its module endpoint and keeps the person expanded", async () => {
    vi.mocked(api.patch).mockResolvedValue({});
    await mount();
    await expandKlein();
    await act(() => {
      checkbox("ost-1 title")!.click();
      return Promise.resolve();
    });
    await flush();
    expect(api.patch).toHaveBeenCalledWith("/ost/solutions/ost-1", {
      validationStatus: "validated",
    });
    expect(document.body.textContent).toContain("ost-1 title"); // still expanded, not reset
    // Counters and rows refetch after the tick.
    expect(
      vi.mocked(api.get).mock.calls.filter((c) => c[0] === "/workload").length,
    ).toBeGreaterThan(1);
  });

  it("unticks a RAID action with the item's parent id", async () => {
    vi.mocked(api.patch).mockResolvedValue({});
    await mount();
    await expandKlein();
    await act(() => {
      checkbox("raid-1 title")!.click();
      return Promise.resolve();
    });
    await flush();
    expect(api.patch).toHaveBeenCalledWith("/raid/raid-1-parent/mitigating-actions/raid-1", {
      isCompleted: false,
    });
  });

  it("rolls the checkbox back when the request fails", async () => {
    vi.mocked(api.patch).mockRejectedValue(new Error("nope"));
    await mount();
    await expandKlein();
    await act(() => {
      checkbox("usm-1 title")!.click();
      return Promise.resolve();
    });
    await flush();
    expect(api.patch).toHaveBeenCalledWith("/story-map/features/usm-1", { isCompleted: true });
    expect(checkbox("usm-1 title")?.checked).toBe(false);
  });

  it("lists unmatched items under an expandable Unassigned row", async () => {
    await mount();
    const toggle = [...document.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Unassigned"),
    );
    await act(() => {
      toggle!.click();
      return Promise.resolve();
    });
    await flush();
    expect(document.body.textContent).toContain("orphan-1 title");
  });
});

describe("Workload task delete", () => {
  afterEach(() => {
    auth.role = "pm";
  });
  const expandKlein = async () => {
    const toggle = [...document.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Klein"),
    );
    await act(() => {
      toggle!.click();
      return Promise.resolve();
    });
    await flush();
  };
  const deleteButton = (title: string) =>
    document.querySelector<HTMLButtonElement>(`button[aria-label="Delete ${title}"]`);
  const modalButton = (label: string) =>
    [...document.querySelectorAll<HTMLButtonElement>("[role='dialog'] button")].find(
      (b) => b.textContent?.trim() === label,
    );

  for (const role of ["pm", "team_member"]) {
    it(`renders Delete right of PM Approval for ${role}`, async () => {
      auth.role = role;
      await mount();
      await expandKlein();
      const ths = [...document.querySelectorAll("table table thead th")].map((h) =>
        h.textContent?.trim(),
      );
      expect(ths.at(-1)).toBe("Delete");
      expect(ths.at(-2)).toContain("PM Approval");
      expect(deleteButton("ost-1 title")).toBeTruthy();
    });
  }

  it("opens a confirmation first, cancels without a request, then deletes and refetches", async () => {
    vi.mocked(api.delete).mockResolvedValue(undefined);
    await mount();
    await expandKlein();
    await act(() => {
      deleteButton("ost-1 title")!.click();
      return Promise.resolve();
    });
    await flush();
    expect(document.querySelector("[role='dialog']")?.textContent).toContain("ost-1 title");
    expect(api.delete).not.toHaveBeenCalled();
    await act(() => {
      modalButton("Cancel")!.click();
      return Promise.resolve();
    });
    await flush();
    expect(api.delete).not.toHaveBeenCalled();

    await act(() => {
      deleteButton("ost-1 title")!.click();
      return Promise.resolve();
    });
    await flush();
    const before = vi.mocked(api.get).mock.calls.filter((c) => c[0] === "/workload").length;
    await act(() => {
      modalButton("Delete")!.click();
      return Promise.resolve();
    });
    await flush();
    expect(api.delete).toHaveBeenCalledWith("/work-items/ost/ost-1");
    expect(
      vi.mocked(api.get).mock.calls.filter((c) => c[0] === "/workload").length,
    ).toBeGreaterThan(before);
  });
});

describe("Workload page as a team member", () => {
  afterEach(() => {
    auth.role = "pm";
  });

  it("shows every person and their counts, with expandable task rows, like a PM", async () => {
    auth.role = "team_member";
    await mount();
    const names = [
      ...document.querySelectorAll("tbody button[aria-expanded]:not([aria-label^='Filter '])"),
    ].map((b) => b.textContent?.replace(/[▸▾]\s*/, "").trim());
    expect(names).toEqual(["Clea", "Klein", "Unassigned"]);
    expect(cells("Klein")[4]).toBe("4");
    expect(cells("Clea")).toHaveLength(9);
    const toggle = [...document.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Klein"),
    )!;
    await act(async () => {
      toggle.click();
      await Promise.resolve();
    });
    expect(document.body.textContent).toContain("PM Approval");
    expect(document.querySelectorAll("[data-testid='work-item-row']").length).toBeGreaterThan(0);
  });

  it("names projects the viewer is not a member of from the response", async () => {
    auth.role = "team_member";
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === "/projects") return Promise.resolve({ items: [] });
      if (url === "/workload")
        return Promise.resolve({ ...DATA, projectNames: { p1: "Hidden Project" } });
      return Promise.resolve({ items: [] });
    });
    await mount();
    const toggle = [...document.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Klein"),
    )!;
    await act(async () => {
      toggle.click();
      await Promise.resolve();
    });
    expect(document.body.textContent).toContain("Hidden Project");
  });
});
