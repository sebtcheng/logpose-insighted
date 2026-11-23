// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ProjectsPage } from "./ProjectsPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const USERS = [
  { id: "00000000-0000-4000-8000-000000000001", fullName: "Paula Manager", isActive: true },
  { id: "00000000-0000-4000-8000-000000000002", fullName: "Alice Analyst", isActive: true },
  { id: "00000000-0000-4000-8000-000000000003", fullName: "Bob Builder", isActive: true },
];
const PROJECT = {
  id: "p-1",
  name: "eSF7",
  code: "PROJ-01",
  ownerId: "00000000-0000-4000-8000-000000000002",
  ownerName: "Alice Analyst",
  memberIds: ["00000000-0000-4000-8000-000000000003", "00000000-0000-4000-8000-000000000001"],
  members: [
    { id: "00000000-0000-4000-8000-000000000003", fullName: "Bob Builder" },
    { id: "00000000-0000-4000-8000-000000000001", fullName: "Paula Manager" },
  ],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  archivedAt: null,
  subprojects: [],
};

const h = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), role: "pm" }));
vi.mock("../auth", () => ({
  useIsPm: () => h.role === "pm",
  useAuth: () => ({
    id: "00000000-0000-4000-8000-000000000001",
    role: h.role,
    fullName: "Paula Manager",
    email: "p@x.test",
  }),
}));
vi.mock("../api/hooks", () => {
  const ok = (data: unknown) => ({ data, isPending: false, isError: false, isSuccess: true });
  const mut = (fn: unknown) => () => ({ mutate: fn, isPending: false });
  return {
    useProjects: () => ok([PROJECT]),
    useProjectsWithSubprojects: () => ok([PROJECT]),
    useUsers: () => ok(USERS),
    useCreateProject: mut(h.create),
    useUpdateProject: mut(h.update),
    useCreateSubproject: mut(vi.fn()),
    useUpdateSubproject: mut(vi.fn()),
    useDeleteProject: mut(vi.fn()),
    useDeleteSubproject: mut(vi.fn()),
  };
});

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
afterEach(() => {
  while (cleanups.length) cleanups.pop()?.();
  vi.clearAllMocks();
});

function mount() {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const root = createRoot(el);
  act(() => {
    root.render(
      createElement(
        MantineProvider,
        null,
        createElement(MemoryRouter, null, createElement(ProjectsPage)),
      ),
    );
  });
  cleanups.push(() => {
    act(() => root.unmount());
    el.remove();
  });
}

const byText = (sel: string, text: string) =>
  [...document.querySelectorAll<HTMLElement>(sel)].find((e) => e.textContent?.trim() === text);
const inputByLabel = (label: string) => {
  const l = [...document.querySelectorAll("label")].find((e) => e.textContent?.startsWith(label));
  return document.getElementById(l?.getAttribute("for") ?? "") as HTMLInputElement | null;
};
const flush = () => act(async () => void (await new Promise((r) => setTimeout(r, 400))));
const submit = async () => {
  act(() => document.querySelector<HTMLButtonElement>('button[type="submit"]')?.click());
  await flush();
};

describe("project modals: Owner and Team members", () => {
  it("New project shows both fields, defaults the owner to the creator and submits ownerId and memberIds", async () => {
    mount();
    act(() => byText("button", "New project")?.click());
    await flush();
    expect(inputByLabel("Owner")?.value).toBe("Paula Manager");
    expect(inputByLabel("Team members")).not.toBeNull();
    expect(document.body.textContent).not.toContain("WIP limit");
    const name = inputByLabel("Name");
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
        name,
        "Roadmap",
      );
      name?.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await submit();
    expect(h.create).toHaveBeenCalledTimes(1);
    expect(h.create.mock.calls[0]?.[0]).toMatchObject({
      name: "Roadmap",
      ownerId: "00000000-0000-4000-8000-000000000001",
      memberIds: [],
    });
    expect(h.create.mock.calls[0]?.[0]).not.toHaveProperty("wipLimitPerPerson");
  });

  it("Edit project pre-populates the owner and members and submits them unchanged", async () => {
    mount();
    act(() => byText("td a", "eSF7")?.closest("tr")?.click());
    await flush();
    expect(inputByLabel("Owner")?.value).toBe("Alice Analyst");
    expect(document.body.textContent).not.toContain("WIP limit");
    const pills = [...document.querySelectorAll(".mantine-MultiSelect-pill")].map((e) =>
      e.textContent?.trim(),
    );
    expect(pills.sort()).toEqual(["Bob Builder", "Paula Manager"]);
    await submit();
    expect(h.update).toHaveBeenCalledTimes(1);
    expect(h.update.mock.calls[0]?.[0]).toMatchObject({
      id: "p-1",
      patch: {
        name: "eSF7",
        ownerId: "00000000-0000-4000-8000-000000000002",
        memberIds: ["00000000-0000-4000-8000-000000000003", "00000000-0000-4000-8000-000000000001"],
      },
    });
    expect(h.update.mock.calls[0]?.[0]).not.toHaveProperty("patch.wipLimitPerPerson");
  });
});

describe("New project for a team member", () => {
  afterEach(() => {
    h.role = "pm";
  });

  it("offers New project and creates one without any PM-only controls", async () => {
    h.role = "team_member";
    mount();
    expect(byText("button", "New project")).toBeTruthy();
    act(() => byText("button", "New project")?.click());
    await flush();
    expect(inputByLabel("Name")).not.toBeNull();
    expect(byText("button", "Create")).toBeTruthy();
  });
});

describe("Projects table: Owner and Team members, and Edit for every role", () => {
  afterEach(() => {
    h.role = "pm";
  });

  it("renders the Owner and Team members columns for each project", async () => {
    mount();
    await flush();
    const heads = [...document.querySelectorAll("thead th")].map((t) => t.textContent?.trim());
    expect(heads).toEqual(["Project↕⧗", "Code↕⧗", "Owner↕⧗", "Team members↕⧗", "Created↕⧗", ""]);
    const row = byText("td a", "eSF7")!.closest("tr")!;
    expect(row.querySelector("[data-col='owner']")?.textContent).toBe("Alice Analyst");
    expect(
      [...row.querySelectorAll("[data-col='members'] .mantine-Badge-root")].map(
        (b) => b.textContent,
      ),
    ).toEqual(["Bob Builder", "Paula Manager"]);
  });

  it("lets a team member open Edit from the row button and save, without PM-only buttons", async () => {
    h.role = "team_member";
    mount();
    await flush();
    const row = byText("td a", "eSF7")!.closest("tr")!;
    const labels = [...row.querySelectorAll("button")].map((b) => b.textContent?.trim());
    expect(labels).toEqual(["Edit"]);
    act(() => [...row.querySelectorAll("button")].find((b) => b.textContent === "Edit")?.click());
    await flush();
    expect(inputByLabel("Owner")?.value).toBe("Alice Analyst");
    await submit();
    expect(h.update).toHaveBeenCalledTimes(1);
    expect(h.update.mock.calls[0]?.[0]).toMatchObject({ id: "p-1" });
  });
});
