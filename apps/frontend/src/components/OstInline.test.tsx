// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { OstTreeDto } from "@myapp/shared";

const patch = vi.hoisted(() => vi.fn());
vi.mock("../api/client", () => ({
  api: { patch, get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
import { OutcomeCard } from "../pages/OstPage";
import type { OstCtx } from "./ostTypes";
import { OstActionBar } from "./OstActionBar";
import { OstTable } from "./OstTable";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const KEY = ["ost", "p1"];
const baseTree = (): OstTreeDto => ({
  outcomes: [
    {
      id: "o1",
      projectId: "p1",
      projectName: "Student Engagement Analytics",
      title: "Reduce dropouts",
      description: null,
    },
  ],
  opportunities: [
    {
      id: "p1",
      outcomeId: "o1",
      title: "Students feel lost",
      isTargeted: false,
    },
  ],
  solutions: [
    {
      id: "s1",
      opportunityId: "p1",
      code: "OST-01",
      title: "Onboarding checklist",
      validationStatus: "validated",
      ownerId: null,
      ownerName: "Ana Reyes",
      targetDate: null,
      sprintKey: null,
      sprintLabel: null,
      pmApproval: "APPROVED" as const,
      convertedStoryId: null,
      convertedStoryCode: null,
    },
    {
      id: "s2",
      opportunityId: "p1",
      code: "OST-02",
      title: "Guided first lesson",
      validationStatus: "planned",
      ownerId: null,
      ownerName: null,
      targetDate: null,
      sprintKey: null,
      sprintLabel: null,
      pmApproval: "APPROVED" as const,
      convertedStoryId: null,
      convertedStoryCode: null,
    },
  ],
});

let server: OstTreeDto;
const cleanups: Array<() => void> = [];

beforeAll(() => {
  if (typeof window.matchMedia !== "function")
    window.matchMedia = (q: string) => ({
      matches: false,
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    });
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});
beforeEach(() => {
  server = baseTree();
  patch.mockReset();
  patch.mockImplementation((url: string, body: { validationStatus: "validated" | "planned" }) => {
    const id = url.split("/").pop();
    server = {
      ...server,
      solutions: server.solutions.map((x) =>
        x.id === id ? { ...x, validationStatus: body.validationStatus } : x,
      ),
    };
    return Promise.resolve({});
  });
});
afterEach(() => {
  while (cleanups.length) cleanups.pop()?.();
  document.body.innerHTML = "";
});

const flush = async () => {
  for (let i = 0; i < 5; i++)
    await act(async () => void (await new Promise((r) => setTimeout(r, 5))));
};

let asPm = true;
function Page({ view }: { view: "card" | "table" }) {
  const q = useQuery({ queryKey: KEY, queryFn: () => Promise.resolve(structuredClone(server)) });
  if (!q.data) return null;
  const ctx: OstCtx = {
    tree: q.data,
    isPm: asPm,
    readOnly: false,
    setDialog: () => {},
    openSolution: () => {},
  };
  return view === "table"
    ? createElement(OstTable, { ctx })
    : createElement(OutcomeCard, { outcome: q.data.outcomes[0]!, ctx });
}

async function mount(view: "card" | "table") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() =>
    root.render(
      createElement(
        QueryClientProvider,
        { client: qc },
        createElement(MantineProvider, null, createElement(Page, { view })),
      ),
    ),
  );
  cleanups.push(() => act(() => root.unmount()));
  await flush();
  if (view === "card") {
    // Card view is a compact summary; the tickable steps live in the slide-over drawer (portal in body).
    act(() => host.querySelector<HTMLElement>('[aria-label^="View steps for"]')?.click());
    await flush();
    return { host: document.body, qc };
  }
  return { host, qc };
}

const boxes = (host: HTMLElement) => [
  ...host.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
];

describe("OstActionBar", () => {
  it("groups add, workflow and edit/delete actions in that order", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    act(() =>
      root.render(
        createElement(
          MantineProvider,
          null,
          createElement(OstActionBar, {
            scope: "requirement",
            create: [{ label: "Add solution", onClick: () => {} }],
            workflow: [{ label: "Target this", onClick: () => {} }],
            onEdit: () => {},
            onDelete: () => {},
          }),
        ),
      ),
    );
    cleanups.push(() => act(() => root.unmount()));
    const groups = [...host.querySelectorAll('[role="group"]')];
    expect(groups.map((g) => g.getAttribute("aria-label"))).toEqual([
      "Add to requirement",
      "Workflow for requirement",
      "Edit or delete requirement",
    ]);
    expect(groups.map((g) => [...g.querySelectorAll("button")].map((b) => b.textContent))).toEqual([
      ["Add solution"],
      ["Target this"],
      ["Edit", "Delete"],
    ]);
    expect(host.querySelector('[role="toolbar"]')?.getAttribute("aria-label")).toBe(
      "requirement actions",
    );
  });

  it("omits clusters that have no actions", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    act(() =>
      root.render(
        createElement(
          MantineProvider,
          null,
          createElement(OstActionBar, {
            scope: "OST-01",
            workflow: [{ label: "Assumptions", onClick: () => {} }],
          }),
        ),
      ),
    );
    cleanups.push(() => act(() => root.unmount()));
    expect(host.querySelectorAll('[role="group"]')).toHaveLength(1);
    expect(host.textContent).not.toContain("Delete");
  });
});

describe.each(["card", "table"] as const)("inline solution ticks in the %s view", (view) => {
  it("shows each solution as a checkbox, with the first one ticked", async () => {
    const { host } = await mount(view);
    expect(boxes(host).map((b) => b.checked)).toEqual([true, false]);
    expect(host.textContent).not.toMatch(/assumption|sub-opportunit/i);
    expect(host.querySelector('[role="toolbar"]')).not.toBeNull();
  });

  it("ticks through the solution PATCH endpoint and updates the checkbox", async () => {
    const { host } = await mount(view);
    act(() => boxes(host)[1]?.click());
    await flush();
    expect(patch).toHaveBeenCalledWith("/ost/solutions/s2", { validationStatus: "validated" });
    expect(boxes(host).map((b) => b.checked)).toEqual([true, true]);
  });

  it("unticks back to planned", async () => {
    const { host } = await mount(view);
    act(() => boxes(host)[0]?.click());
    await flush();
    expect(patch).toHaveBeenCalledWith("/ost/solutions/s1", { validationStatus: "planned" });
    expect(boxes(host).map((b) => b.checked)).toEqual([false, false]);
  });

  it("rolls the tick back when the request fails", async () => {
    patch.mockImplementation(() => Promise.reject(new Error("nope")));
    const { host } = await mount(view);
    act(() => boxes(host)[1]?.click());
    await flush();
    expect(patch).toHaveBeenCalledTimes(1);
    expect(boxes(host).map((b) => b.checked)).toEqual([true, false]);
  });
});

describe("OST side modal", () => {
  it("states the outcome once in the header and lists requirements with solutions beneath", async () => {
    const { host } = await mount("card");
    const dialog = host.querySelector('[role="dialog"]')!;
    const header = dialog.querySelector("header, .mantine-Drawer-header")!;
    expect(header.textContent).toContain("Reduce dropouts");
    expect(header.textContent).toContain("Edit");
    expect(header.textContent).toContain("Delete");
    const body = dialog.querySelector(".mantine-Drawer-body")!;
    expect(body.textContent).not.toContain("Reduce dropouts");
    expect(body.textContent).toContain("Students feel lost");
    expect(body.textContent).toContain("Requirements");
    expect(body.textContent).toContain("Add requirements");
    expect(body.textContent).not.toMatch(/Opportunit/);
    expect(body.textContent).toContain("Add solution");
    expect(body.textContent).toContain("Guided first lesson");
    expect(body.textContent).not.toMatch(/Add sub-opportunity|assumption/i);
  });
});

describe("OST compact card", () => {
  it("shows live completion on the card face and keeps it in sync while the drawer is open", async () => {
    const { host } = await mount("card");
    const card = () => document.body.querySelector('[aria-label^="View steps for"]')?.textContent;
    expect(card()).toContain("50% complete");
    expect(card()).not.toContain("Students feel lost");
    act(() => boxes(host)[1]?.click());
    await flush();
    expect(card()).toContain("100% complete");
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
  });
});

describe("solution ticks keep the cache in sync across views", () => {
  it("moves the optimistic state before the server answers", async () => {
    let release: () => void = () => {};
    patch.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => resolve({});
        }),
    );
    const { host, qc } = await mount("table");
    act(() => boxes(host)[1]?.click());
    await flush();
    const cached = qc.getQueryData<OstTreeDto>(KEY);
    expect(cached?.solutions.find((x) => x.id === "s2")?.validationStatus).toBe("validated");
    release();
    await flush();
  });
});

describe("OstTable column inventory", () => {
  const cells = (host: HTMLElement) =>
    [...host.querySelectorAll("tbody tr")].map((tr) =>
      [...tr.querySelectorAll("td")].map((td) => td.textContent ?? ""),
    );

  it("renders a dedicated header per column, with a labelled Actions column", async () => {
    server = {
      ...server,
      outcomes: [{ ...server.outcomes[0]! }],
    };
    const { host } = await mount("table");
    const heads = [...host.querySelectorAll("thead th")].map((th) => th.textContent);
    expect(heads).toEqual([
      "Level",
      "Item",
      "Project",
      "Details",
      "Owner",
      "Progress / Target",
      "Status",
      "Actions",
    ]);
    const [outcome, opportunity, solution] = cells(host);
    // Outcome: project name, no owner, no target date.
    expect(outcome?.[2]).toBe("Student Engagement Analytics");
    expect(outcome?.[4]).toBe("—");
    expect(outcome?.[5]).toBe("—");
    // Requirement: solution coverage in Progress, workflow badge only in Status.
    expect(opportunity?.[2]).toBe("—");
    expect(opportunity?.[5]).toBe("2/3 solutions");
    expect(opportunity?.[6]).toBe("—");
    // Solution: owner and validation ratio in their own columns, status stays a badge.
    expect(solution?.[4]).toBe("Ana Reyes");
    expect(solution?.[5]).toBe("1/1 validated");
    expect(solution?.[6]).toMatch(/validated/i);
    expect(solution?.[3]).not.toContain("Ana Reyes");
  });

  it("keeps inline solution ticking working from the Details column", async () => {
    const { host } = await mount("table");
    expect(boxes(host).map((b) => b.checked)).toEqual([true, false]);
    act(() => boxes(host)[1]?.click());
    await flush();
    expect(patch).toHaveBeenCalled();
  });
});

describe.each(["card", "table"] as const)("OST as a team member in the %s view", (view) => {
  afterEach(() => {
    asPm = true;
  });

  it("can add, edit and tick but not delete or convert", async () => {
    asPm = false;
    const { host } = await mount(view);
    const labels = [...host.querySelectorAll("button")].map((b) => b.textContent?.trim());
    expect(labels).toContain("Add solution");
    expect(labels).toContain("Edit");
    expect(labels).not.toContain("Delete");
    expect(labels).not.toContain("Convert to story");
    expect(boxes(host).every((b) => !b.disabled)).toBe(true);
  });
});
