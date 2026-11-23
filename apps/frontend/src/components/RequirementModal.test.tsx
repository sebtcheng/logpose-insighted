// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { listSprintOptions } from "@myapp/shared";
import { RequirementModal, stepsToDrafts } from "./RequirementModal";

vi.mock("../api/lookups", async (orig) => {
  const { mockUseRefSprints } = await import("../lib/testRefSprints");
  return { ...(await orig<Record<string, unknown>>()), useRefSprints: mockUseRefSprints };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const STAFF = [
  { value: "u-pm", label: "Paula Manager" },
  { value: "u-tm", label: "Tomas Member" },
];

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

function mount(props: Partial<Parameters<typeof RequirementModal>[0]> = {}) {
  const onSubmit = vi.fn();
  const el = document.createElement("div");
  document.body.appendChild(el);
  const root = createRoot(el);
  act(() => {
    root.render(
      createElement(
        MantineProvider,
        null,
        createElement(RequirementModal, {
          title: "Add requirements",
          staffOptions: STAFF,
          onClose: vi.fn(),
          onSubmit,
          ...props,
        }),
      ),
    );
  });
  cleanups.push(() => {
    act(() => root.unmount());
    el.remove();
  });
  return { onSubmit };
}

const nativeSet = (proto: object) =>
  // React tracks the native value setter, so call it directly to fire onChange.
  // eslint-disable-next-line @typescript-eslint/unbound-method
  Object.getOwnPropertyDescriptor(proto, "value")!.set as (
    this: HTMLInputElement,
    v: string,
  ) => void;

function type(input: HTMLInputElement, value: string) {
  act(() => {
    nativeSet(HTMLInputElement.prototype).call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

const q = <T extends Element>(sel: string) => document.querySelector<T>(sel)!;
const submit = async () =>
  act(async () => {
    q<HTMLFormElement>("form").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
    await Promise.resolve();
  });

describe("RequirementModal", () => {
  it("has no Evidence or Notes inputs and is wide enough for the row controls", () => {
    mount();
    const text = document.body.textContent ?? "";
    expect(text).toContain("Requirement");
    expect(text).not.toMatch(/Evidence|Notes/);
    expect(q<HTMLElement>(".mantine-Drawer-root").getAttribute("style")).toMatch(
      /--drawer-size: calc\(53\.75rem/,
    );
  });

  it("adds, edits and submits a step with person responsible and sprint", async () => {
    const { onSubmit } = mount();
    type(q<HTMLInputElement>("input[data-autofocus]"), "Reliable onboarding");
    const add = [...document.querySelectorAll("button")].find((b) => b.textContent === "Add step")!;
    act(() => add.click());
    type(q<HTMLInputElement>('input[aria-label="Step 1"]'), "Write the guide");
    expect(document.querySelector('input[type="date"]')).toBeNull();
    const sprint = listSprintOptions()[1]!;
    await act(async () => {
      q<HTMLInputElement>('input[aria-label="Step 1 sprint"]').click();
      await Promise.resolve();
    });
    const sprintListId = q<HTMLInputElement>('input[aria-label="Step 1 sprint"]').getAttribute(
      "aria-controls",
    )!;
    const sprintOptions = () => [
      ...document.querySelectorAll<HTMLElement>(`[id="${sprintListId}"] [role="option"]`),
    ];
    const sprintLabels = sprintOptions().map((o) => o.textContent ?? "");
    expect(sprintLabels.length).toBeGreaterThan(10);
    for (const l of sprintLabels)
      expect(l).toMatch(/^Sprint \d+ — Ends Sun, \w{3} \d{1,2}, \d{4}$/);
    await act(async () => {
      sprintOptions()
        .find((o) => o.textContent === sprint.label)!
        .click();
      await Promise.resolve();
    });
    // A new step is PENDING PM approval, so its completion checkbox is locked.
    const done = q<HTMLInputElement>('input[aria-label="Step 1 done"]');
    expect(done.disabled).toBe(true);
    expect(done.getAttribute("aria-disabled")).toBe("true");
    expect(done.getAttribute("title")).toBe("Pending Project Manager approval");
    await act(async () => {
      q<HTMLInputElement>('input[aria-label="Step 1 staff responsible"]').click();
      await Promise.resolve();
    });
    const staffListId = q<HTMLInputElement>(
      'input[aria-label="Step 1 staff responsible"]',
    ).getAttribute("aria-controls")!;
    const staffOptions = [
      ...document.querySelectorAll<HTMLElement>(`[id="${staffListId}"] [role="option"]`),
    ];
    const option = staffOptions.find((o) => o.textContent === "Tomas Member")!;
    expect(staffOptions.map((o) => o.textContent)).toEqual(["Paula Manager", "Tomas Member"]);
    await act(async () => {
      option.click();
      await Promise.resolve();
    });
    await submit();
    expect(onSubmit).toHaveBeenCalledWith({
      title: "Reliable onboarding",
      solutions: [
        { title: "Write the guide", completed: false, ownerId: "u-tm", sprintKey: sprint.key },
      ],
    });
  });

  it("blocks a blank requirement, drops blank steps and removes rows", async () => {
    const { onSubmit } = mount({
      initialTitle: "Existing",
      initialSteps: stepsToDrafts([
        {
          id: "s1",
          title: "Keep me",
          ownerId: "u-pm",
          targetDate: "2026-11-30",
          validationStatus: "validated",
        },
        {
          id: "s2",
          title: "Remove me",
          ownerId: null,
          targetDate: null,
          validationStatus: "planned",
        },
      ]),
    });
    expect(q<HTMLInputElement>('input[aria-label="Step 1"]').value).toBe("Keep me");
    expect(q<HTMLInputElement>('input[aria-label="Step 1 done"]').checked).toBe(true);
    expect(q<HTMLInputElement>('input[aria-label="Step 1 staff responsible"]').value).toBe(
      "Paula Manager",
    );
    // Legacy mid-week date (Mon 2026-11-30) maps to the sprint ending Sun 2026-12-06.
    expect(q<HTMLInputElement>('input[aria-label="Step 1 sprint"]').value).toBe(
      "Sprint 49 — Ends Sun, Dec 6, 2026",
    );
    act(() => q<HTMLButtonElement>('button[aria-label="Remove step 2"]').click());
    expect(document.querySelector('input[aria-label="Step 2"]')).toBeNull();
    type(q<HTMLInputElement>("input[data-autofocus]"), "   ");
    await submit();
    expect(onSubmit).not.toHaveBeenCalled();
    type(q<HTMLInputElement>("input[data-autofocus]"), "Existing");
    await submit();
    expect(onSubmit).toHaveBeenCalledWith({
      title: "Existing",
      solutions: [
        { id: "s1", title: "Keep me", completed: true, ownerId: "u-pm", sprintKey: "2026-S49" },
      ],
    });
  });
});
