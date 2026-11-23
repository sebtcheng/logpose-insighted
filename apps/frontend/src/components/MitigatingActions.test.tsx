// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MantineProvider } from "@mantine/core";
import { MitigatingActionsField, type MitigatingActionDraft } from "./MitigatingActions";
import { sprintDraftValue } from "./SprintSelect";

vi.mock("../api/lookups", async (orig) => {
  const { mockUseRefSprints } = await import("../lib/testRefSprints");
  return { ...(await orig<Record<string, unknown>>()), useRefSprints: mockUseRefSprints };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const cleanups: Array<() => void> = [];
beforeAll(() => {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: false,
    media: q,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
});
beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = () => undefined;
      unobserve = () => undefined;
      disconnect = () => undefined;
    },
  );
});
afterEach(() => {
  while (cleanups.length) cleanups.pop()?.();
});

const staff = [
  { value: "u1", label: "Ben Cruz" },
  { value: "u2", label: "Ana Reyes" },
];

function mount(value: MitigatingActionDraft[], onChange = vi.fn()) {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const root = createRoot(el);
  act(() => {
    root.render(
      createElement(
        QueryClientProvider,
        { client: new QueryClient() },
        createElement(
          MantineProvider,
          null,
          createElement(MitigatingActionsField, { value, onChange, staffOptions: staff }),
        ),
      ),
    );
  });
  cleanups.push(() => {
    act(() => root.unmount());
    el.remove();
  });
  return { el, onChange };
}

describe("MitigatingActionsField sprints", () => {
  it("replaces the date input with a sprint select showing number and Sunday end date", () => {
    const { el } = mount([
      {
        id: "a1",
        description: "Do it",
        isCompleted: false,
        sprintKey: "2026-S52",
        responsibleId: "u1",
      },
    ]);
    expect(el.querySelector('input[type="date"]')).toBeNull();
    const input = el.querySelector<HTMLInputElement>('input[aria-label="Action 1 sprint"]')!;
    expect(input.value).toBe("Sprint 52 — Ends Sun, Dec 27, 2026");
    expect(input.required).toBe(true);
  });

  it("lists sprint options with Sunday end dates and reports the selection", () => {
    const { el, onChange } = mount([
      {
        id: "a1",
        description: "Do it",
        isCompleted: false,
        sprintKey: "2026-S52",
        responsibleId: "u1",
      },
    ]);
    const input = el.querySelector<HTMLInputElement>('input[aria-label="Action 1 sprint"]')!;
    act(() => input.click());
    const listId = input.getAttribute("aria-controls")!;
    const options = [...document.querySelectorAll<HTMLElement>(`[id="${listId}"] [role="option"]`)];
    expect(options.length).toBeGreaterThan(10);
    for (const o of options)
      expect(o.textContent).toMatch(/^Sprint \d+ — Ends Sun, \w{3} \d{1,2}, \d{4}$/);
    const next = options.find((o) => !o.textContent.includes("Sprint 52 — Ends Sun, Dec 27"))!;
    act(() => next.click());
    expect(onChange).toHaveBeenCalledTimes(1);
    const sent = (onChange.mock.calls[0]![0] as MitigatingActionDraft[])[0]!;
    expect(sent.sprintKey).toMatch(/^\d{4}-S\d{2}$/);
    expect(sent.sprintKey).not.toBe("2026-S52");
  });

  it("maps a legacy mid-week date to its containing sprint when drafting", () => {
    expect(sprintDraftValue(null, "2026-11-18")).toBe("2026-S47");
    expect(sprintDraftValue(null, null)).toBe("");
  });

  it("shows the chosen staff member per row, empty for a new action", () => {
    const { el } = mount([
      {
        id: "a1",
        description: "Do it",
        isCompleted: false,
        sprintKey: "2026-S52",
        responsibleId: "u1",
      },
      { description: "New", isCompleted: false, sprintKey: "", responsibleId: "" },
    ]);
    const selects = el.querySelectorAll<HTMLInputElement>('input[aria-label$="staff responsible"]');
    expect(selects).toHaveLength(2);
    expect(selects[0]!.value).toBe("Ben Cruz");
    expect(selects[1]!.value).toBe("");
  });

  it("adds new actions with no sprint selected", () => {
    const { el, onChange } = mount([]);
    const btn = [...el.querySelectorAll("button")].find((b) => b.textContent === "Add action")!;
    act(() => btn.click());
    expect(onChange).toHaveBeenCalledWith([
      { description: "", isCompleted: false, sprintKey: "", responsibleId: "" },
    ]);
  });
});
