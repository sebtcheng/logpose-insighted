// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { KanoDto } from "@myapp/shared";

vi.mock("../api/client", () => ({
  api: { patch: vi.fn(), post: vi.fn(), delete: vi.fn(), get: vi.fn(), put: vi.fn() },
}));
import { api } from "../api/client";
import { KanoSpecChecklist } from "../components/KanoSpecs";
import { EditModal } from "./KanoPage";

vi.mock("../api/lookups", async (orig) => {
  const { mockUseRefSprints } = await import("../lib/testRefSprints");
  return { ...(await orig<Record<string, unknown>>()), useRefSprints: mockUseRefSprints };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const USERS = [
  { id: "u-pm", fullName: "Paula Manager", role: "pm", isActive: true },
  { id: "u-tm", fullName: "Tomas Member", role: "team_member", isActive: true },
];
const spec = (over: Record<string, unknown>) => ({
  id: "s1",
  label: "Add CSV button",
  isCompleted: false,
  completedAt: null,
  sortOrder: 0,
  targetDate: "2026-12-06",
  sprintKey: "2026-S49",
  sprintLabel: "Sprint 49 — Ends Sun, Dec 6, 2026",
  responsibleId: "u-tm",
  responsibleName: "Tomas Member",
  ...over,
});
const request = {
  id: "k1",
  projectId: "p1",
  code: "REQ-001",
  projectName: "Infra",
  revisionRequest: "Add categories",
  specs: [
    spec({}),
    spec({
      id: "s2",
      label: "Plain",
      targetDate: null,
      sprintKey: null,
      sprintLabel: null,
      responsibleId: null,
      responsibleName: null,
    }),
  ],
  specsTotal: 2,
  specsCompleted: 0,
  completionPercent: 0,
  isComplete: false,
  kanoCategory: null,
  targetDate: "2026-01-01",
  responsibleId: "u-tm",
  responsibleName: "Tomas Member",
} as unknown as KanoDto;

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
  vi.mocked(api.get).mockImplementation((url: string) =>
    Promise.resolve({ items: url === "/users" ? USERS : [] }),
  );
  vi.mocked(api.patch).mockResolvedValue({});
});
afterEach(() => {
  while (cleanups.length) cleanups.pop()?.();
  vi.clearAllMocks();
});

async function mount(node: ReturnType<typeof createElement>) {
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
  cleanups.push(() => {
    act(() => root.unmount());
    el.remove();
  });
}

const byLabel = (label: string) =>
  document.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`);
const click = (el: Element | null | undefined) =>
  act(() => {
    (el as HTMLElement).click();
    return Promise.resolve();
  });
const setValue = (el: HTMLInputElement, v: string) =>
  act(() => {
    // React tracks the native value setter, so call it directly to fire onChange.
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return Promise.resolve();
  });

describe("Kano per-spec sprint and person responsible", () => {
  it("drops the request-level Target date but keeps the other fields", async () => {
    await mount(createElement(EditModal, { request, onClose: vi.fn() }));
    const labels = [...document.querySelectorAll("label")].map((l) => l.textContent ?? "");
    expect(labels.some((l) => l.startsWith("Target date"))).toBe(false);
    for (const keep of ["Project", "Kano category", "Person responsible"]) {
      expect(
        labels.some((l) => l.startsWith(keep)),
        keep,
      ).toBe(true);
    }
  });

  it("pre-populates each spec row, edits, adds and removes, and saves the full payload", async () => {
    await mount(createElement(EditModal, { request, onClose: vi.fn() }));
    expect(document.querySelector('input[type="date"]')).toBeNull();
    expect(byLabel("Spec 1 sprint")?.value).toBe("Sprint 49 — Ends Sun, Dec 6, 2026");
    expect(byLabel("Spec 1 person responsible")?.value).toBe("Tomas Member");
    expect(byLabel("Spec 2 sprint")?.value).toBe("");

    await click(byLabel("Spec 2 sprint"));
    const sprintListId = byLabel("Spec 2 sprint")!.getAttribute("aria-controls")!;
    const sprintOption = [
      ...document.querySelectorAll<HTMLElement>(`[id="${sprintListId}"] [role="option"]`),
    ].find((o) => o.textContent === "Sprint 49 — Ends Sun, Dec 6, 2026");
    expect(sprintOption, "sprint option with number and Sunday end date").toBeTruthy();
    await click(sprintOption);
    await click(byLabel("Spec 2 person responsible"));
    const listId = byLabel("Spec 2 person responsible")!.getAttribute("aria-controls")!;
    const option = [
      ...document.querySelectorAll<HTMLElement>(`[id="${listId}"] [role="option"]`),
    ].find((o) => o.textContent === "Paula Manager");
    expect(option, "option in this select's list").toBeTruthy();
    await click(option);

    await click([...document.querySelectorAll("button")].find((b) => b.textContent === "Add spec"));
    expect(byLabel("Spec 3 sprint")?.value).toBe("");
    expect(byLabel("Spec 3 person responsible")?.value).toBe("");
    await setValue(byLabel("Spec 3")!, "New spec");
    await click(document.querySelector('[aria-label="Remove spec 1"]'));

    await act(async () => {
      document
        .querySelector("form")!
        .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    const body = vi.mocked(api.patch).mock.calls[0]?.[1] as { specs: unknown[] };
    expect(body.specs).toEqual([
      expect.objectContaining({
        id: "s2",
        sprintKey: "2026-S49",
        responsibleId: "u-pm",
      }),
      {
        id: undefined,
        label: "New spec",
        isCompleted: false,
        sprintKey: null,
        responsibleId: null,
      },
    ]);
    expect(body).not.toHaveProperty("targetDate");
  });

  it("list view tags each spec with its date and person and omits empty tags", async () => {
    await mount(createElement(KanoSpecChecklist, { request, editable: false }));
    const text = document.body.textContent ?? "";
    expect(text).toContain("Tomas Member");
    expect(text).toContain("Sprint 49 — Ends Sun, Dec 6, 2026");
    const rows = [...document.querySelectorAll(".mantine-Checkbox-label")].map(
      (l) => l.textContent ?? "",
    );
    expect(rows[1]).toBe("Plain");
  });
});

describe("Kano edit as a team member", () => {
  it("can edit specs but cannot categorize or delete", async () => {
    await mount(createElement(EditModal, { request, onClose: vi.fn(), isPm: false }));
    expect(byLabel("Spec 1")).toBeTruthy();
    const label = [...document.querySelectorAll("label")].find((l) =>
      l.textContent?.startsWith("Kano category"),
    )!;
    expect((document.getElementById(label.htmlFor) as HTMLInputElement | null)?.disabled).toBe(
      true,
    );
    expect([...document.querySelectorAll("button")].some((b) => b.textContent === "Delete")).toBe(
      false,
    );
  });
});
