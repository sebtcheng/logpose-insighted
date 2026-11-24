// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminLogResponse, WorkItem } from "@myapp/shared";
import { WorkItemsTable } from "../components/WorkItems";

vi.mock("../api/client", () => ({
  api: { patch: vi.fn(), post: vi.fn(), delete: vi.fn(), get: vi.fn(), put: vi.fn() },
  errorMessage: (e: unknown) => String(e),
  ApiClientError: class extends Error {},
}));
vi.mock("../auth", async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  useAuth: () => ({ id: "pm1", role: "pm" }),
  useIsPm: () => true,
}));
import { api } from "../api/client";
import { AdminLogPage } from "./AdminLogPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const item = (id: string, over: Partial<WorkItem> = {}): WorkItem => ({
  id,
  sourceModule: "user_story",
  itemKind: "step",
  title: `${id} title`,
  parentTitle: `${id} parent`,
  parentId: `${id}-parent`,
  projectId: "p1",
  subprojectId: null,
  assigneeId: "u1",
  assigneeName: "Klein",
  dueDate: "2026-11-22",
  isCompleted: false,
  completedAt: null,
  scheduleStatus: "ongoing_on_time",
  pmApproval: "PENDING",
  ...over,
});

const DATA: AdminLogResponse = {
  today: "2026-11-20",
  projects: [
    {
      projectId: "p1",
      projectName: "Infra Portal",
      projectCode: "INF",
      total: 2,
      approved: 1,
      pending: 1,
      items: [
        item("usm-1"),
        item("raid-1", { sourceModule: "raid", pmApproval: "APPROVED", isCompleted: true }),
      ],
    },
    {
      projectId: "p2",
      projectName: "Student App",
      projectCode: "STU",
      total: 1,
      approved: 0,
      pending: 1,
      items: [item("ost-1", { sourceModule: "ost", projectId: "p2", title: "OST-01 Quiz" })],
    },
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
    if (url === "/admin-log") return Promise.resolve(DATA);
    if (url === "/users")
      return Promise.resolve({
        items: [{ id: "u1", fullName: "Klein", isActive: true, role: "team_member", email: "k@x" }],
      });
    return Promise.resolve({ items: [] });
  });
  vi.mocked(api.patch).mockResolvedValue(item("usm-1"));
});
afterEach(() => {
  while (cleanups.length) cleanups.pop()?.();
  vi.clearAllMocks();
});

async function mount(node: React.ReactNode) {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => {
    root.render(
      createElement(
        MemoryRouter,
        null,
        createElement(
          QueryClientProvider,
          { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
          createElement(MantineProvider, null, node),
        ),
      ),
    );
    await Promise.resolve();
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 20));
  });
  cleanups.push(() => {
    act(() => root.unmount());
    el.remove();
  });
  return el;
}

const byLabel = (label: string) =>
  document.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`);
const button = (text: string, within: ParentNode = document) =>
  [...within.querySelectorAll("button")].find((b) => b.textContent === text);

describe("Admin Log page", () => {
  it("renders a project selector dropdown with red pending badges and switches displayed tasks", async () => {
    const el = await mount(createElement(AdminLogPage));
    const trigger = el.querySelector<HTMLButtonElement>("[data-testid='admin-log-project-select']")!;
    expect(trigger).toBeTruthy();
    expect(trigger.textContent).toContain("Infra Portal");
    expect(trigger.textContent).toContain("2 tasks");
    expect(trigger.textContent).toContain("1 pending");
    expect(trigger.querySelector("[data-testid='pending-approval-badge']")).toBeTruthy();

    // Main panel renders the first project's tasks
    const section = el.querySelector("[data-testid='admin-log-project']")!;
    expect(section.getAttribute("aria-label")).toBe("Infra Portal");
    expect(section.querySelectorAll("[data-testid='admin-log-row']")).toHaveLength(2);
    const heads = [...el.querySelectorAll("thead th")].map((th) => th.textContent);
    expect(heads.some((h) => h?.includes("PM Approval"))).toBe(true);
    expect(section.textContent).toMatch(/USM/);
    expect(section.textContent).toMatch(/RAID/);
    expect(section.textContent).toContain("Sprint 47 — Ends Sun, Nov 22, 2026");

    // Open dropdown and select Student App
    act(() => {
      trigger.click();
    });
    const options = [...document.querySelectorAll("[role='option']")];
    expect(options).toHaveLength(2);
    expect(options[0]!.querySelector("[data-testid='pending-approval-badge']")?.textContent).toBe("1 pending");
    expect(options[1]!.querySelector("[data-testid='pending-approval-badge']")?.textContent).toBe("1 pending");
    act(() => {
      (options[1] as HTMLElement).click();
    });
    const updatedSection = el.querySelector("[data-testid='admin-log-project']")!;
    expect(updatedSection.getAttribute("aria-label")).toBe("Student App");
    expect(updatedSection.textContent).toMatch(/OST/);
    expect(updatedSection.querySelectorAll("[data-testid='admin-log-row']")).toHaveLength(1);
  });

  it("hides the pending-approval badge when pending count is 0", async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === "/admin-log") {
        return Promise.resolve({
          today: "2026-11-20",
          projects: [
            {
              projectId: "p1",
              projectName: "All Approved",
              projectCode: "APP",
              total: 1,
              approved: 1,
              pending: 0,
              items: [item("raid-1", { sourceModule: "raid", pmApproval: "APPROVED", isCompleted: true })],
            },
          ],
        });
      }
      return Promise.resolve({ items: [] });
    });
    const el = await mount(createElement(AdminLogPage));
    const trigger = el.querySelector<HTMLButtonElement>("[data-testid='admin-log-project-select']")!;
    expect(trigger.textContent).toContain("All Approved");
    expect(trigger.querySelector("[data-testid='pending-approval-badge']")).toBeNull();
  });

  it("locks the completion checkbox until the task is approved", async () => {
    await mount(createElement(AdminLogPage));
    const pending = byLabel("Complete usm-1 title")!;
    expect(pending.disabled).toBe(true);
    expect(pending.getAttribute("aria-disabled")).toBe("true");
    expect(pending.getAttribute("title")).toBe("Pending Project Manager approval");
    expect(byLabel("Reopen raid-1 title")!.disabled).toBe(false);
  });

  it("approves a pending task through the approval endpoint", async () => {
    const el = await mount(createElement(AdminLogPage));
    const row = el.querySelectorAll("[data-testid='admin-log-row']")[0]!;
    await act(async () => {
      button("Approve", row)!.click();
      await Promise.resolve();
    });
    expect(api.patch).toHaveBeenCalledWith("/admin-log/items/user_story/usm-1/approval", {
      pmApproval: "APPROVED",
    });
  });

  it("edits a task and saves only what changed", async () => {
    const el = await mount(createElement(AdminLogPage));
    const row = el.querySelectorAll("[data-testid='admin-log-row']")[0]!;
    await act(async () => {
      button("Edit", row)!.click();
      await Promise.resolve();
    });
    const title = document.querySelector<HTMLInputElement>("input[data-autofocus]")!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
        title,
        "Renamed task",
      );
      title.dispatchEvent(new Event("input", { bubbles: true }));
      await Promise.resolve();
    });
    await act(async () => {
      document
        .querySelector("form")!
        .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(api.patch).toHaveBeenCalledWith("/admin-log/items/user_story/usm-1", {
      title: "Renamed task",
    });
  });
});

describe("PM Approval column in task tables", () => {
  it("shows Pending / Approved badges and gates the checkbox (Workload and Projects tables)", async () => {
    const items = [item("usm-1"), item("raid-1", { sourceModule: "raid", pmApproval: "APPROVED" })];
    const el = await mount(
      createElement(WorkItemsTable, {
        items,
        projectNames: new Map([["p1", "Infra Portal"]]),
        checkable: true,
      }),
    );
    expect(
      [...el.querySelectorAll("thead th")].some((th) => th.textContent?.includes("PM Approval")),
    ).toBe(true);
    const badges = [...el.querySelectorAll("div[data-approval]")].map((b) => b.textContent);
    expect(badges).toEqual(["Approved", "Pending"]);
    expect(byLabel("Complete usm-1 title")!.disabled).toBe(true);
    expect(byLabel("Complete raid-1 title")!.disabled).toBe(false);
  });
});

describe("Admin Log delete", () => {
  const confirmWith = (answer: boolean) => vi.spyOn(window, "confirm").mockReturnValue(answer);

  it("renders Edit and Delete on every row", async () => {
    const el = await mount(createElement(AdminLogPage));
    for (const row of el.querySelectorAll("[data-testid='admin-log-row']")) {
      const labels = [...row.querySelectorAll("button")].map((b) => b.textContent);
      expect(labels).toEqual(expect.arrayContaining(["Edit", "Delete"]));
    }
  });

  it("deletes through the API with the module and id once confirmed", async () => {
    const ask = confirmWith(true);
    vi.mocked(api.delete).mockResolvedValue(undefined);
    const el = await mount(createElement(AdminLogPage));
    const row = el.querySelectorAll("[data-testid='admin-log-row']")[0]!;
    await act(async () => {
      button("Delete", row)!.click();
      await Promise.resolve();
    });
    expect(ask).toHaveBeenCalledWith(expect.stringContaining("usm-1 title"));
    expect(api.delete).toHaveBeenCalledWith("/admin-log/items/user_story/usm-1");
  });

  it("does nothing when the confirmation is cancelled", async () => {
    confirmWith(false);
    const el = await mount(createElement(AdminLogPage));
    const row = el.querySelectorAll("[data-testid='admin-log-row']")[0]!;
    await act(async () => {
      button("Delete", row)!.click();
      await Promise.resolve();
    });
    expect(api.delete).not.toHaveBeenCalled();
  });
});
