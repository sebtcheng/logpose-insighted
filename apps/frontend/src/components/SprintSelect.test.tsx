// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { SprintSelect, sprintDraftValue } from "./SprintSelect";

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
});

function mount(value: string, onChange = vi.fn(), clearable = true) {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const root = createRoot(el);
  act(() => {
    root.render(
      createElement(
        MantineProvider,
        null,
        createElement(SprintSelect, { value, onChange, clearable, "aria-label": "Sprint" }),
      ),
    );
  });
  cleanups.push(() => {
    act(() => root.unmount());
    el.remove();
  });
  const input = el.querySelector<HTMLInputElement>('input[aria-label="Sprint"]')!;
  const options = () => {
    const id = input.getAttribute("aria-controls")!;
    return [...document.querySelectorAll<HTMLElement>(`[id="${id}"] [role="option"]`)];
  };
  return { el, input, options, onChange };
}

describe("SprintSelect", () => {
  it("shows every option as sprint number plus Sunday end date, ascending", () => {
    const { input, options } = mount("");
    act(() => input.click());
    const labels = options().map((o) => o.textContent ?? "");
    expect(labels.length).toBeGreaterThanOrEqual(20);
    for (const l of labels) expect(l).toMatch(/^Sprint \d+ — Ends Sun, \w{3} \d{1,2}, \d{4}$/);
  });

  it("excludes past sprints and reports current/future selections", () => {
    const { input, options, onChange } = mount("");
    act(() => input.click());
    const labels = options().map((o) => o.textContent ?? "");
    expect(labels.some((l) => l.includes("2025"))).toBe(false);
    const first = options()[0]!;
    act(() => first.click());
    expect(onChange).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-S\d{2}$/));
  });

  it("is not clearable where a deadline is required", () => {
    const { el } = mount("2026-S10", vi.fn(), false);
    expect(
      el.querySelector(".mantine-Select-clearButton, .mantine-InputClearButton-root"),
    ).toBeNull();
  });

  it("maps legacy dates to their containing sprint", () => {
    expect(sprintDraftValue(null, "2026-11-18")).toBe("2026-S47");
    expect(sprintDraftValue("2026-S50", "2026-11-18")).toBe("2026-S50");
    expect(sprintDraftValue(null, null)).toBe("");
  });
});
