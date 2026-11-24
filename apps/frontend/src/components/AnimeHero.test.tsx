// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { AnimeHero, type HeaderVariant } from "./AnimeHero";
import { PageHeader } from "./ui";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(() => {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: false,
    media: q,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
});

const ALL_VARIANTS: HeaderVariant[] = [
  "home",
  "usm",
  "history",
  "ost",
  "workload",
  "raid",
  "projects",
  "kano",
  "settings",
  "adminLog",
];

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()?.();
});

async function renderNode(node: React.ReactElement) {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(() => {
    root.render(createElement(MantineProvider, null, node));
    return Promise.resolve();
  });
  cleanups.push(() => {
    act(() => root.unmount());
    el.remove();
  });
  return el;
}

describe("AnimeHero & PageHeader variants", () => {
  it.each(ALL_VARIANTS)(
    "renders the %s header variant with decorative SVG art",
    async (variant) => {
      const el = await renderNode(
        createElement(AnimeHero, {
          variant,
          title: `Title ${variant}`,
          subtitle: `Subtitle ${variant}`,
        }),
      );

      const hero = el.querySelector<HTMLElement>(".lp-hero");
      expect(hero?.dataset.variant).toBe(variant);
      expect(hero?.querySelector(".lp-hero__tag")?.textContent).toBe("HOME PORT");
      expect(hero?.querySelector("h1")?.textContent).toBe(`Title ${variant}`);
      expect(hero?.querySelector(".lp-hero__subtitle")?.textContent).toBe(`Subtitle ${variant}`);

      const svg = hero?.querySelector("svg.lp-hero__art");
      expect(svg).not.toBeNull();
      expect(svg?.getAttribute("aria-hidden")).toBe("true");
      expect(svg?.getAttribute("viewBox")).toBe("0 0 1440 240");
    },
  );

  it("renders ReactNode subtitles and action slots via PageHeader", async () => {
    const el = await renderNode(
      createElement(PageHeader, {
        variant: "history",
        title: "Sprint 12",
        subtitle: createElement(
          "span",
          null,
          createElement("a", { href: "/projects/p1" }, "All sprints"),
          " · Nov 1 to Nov 14",
        ),
        actions: createElement("button", { type: "button" }, "New item"),
      }),
    );

    const hero = el.querySelector<HTMLElement>(".lp-hero");
    expect(hero?.dataset.variant).toBe("history");
    expect(hero?.querySelector(".lp-hero__subtitle a")?.textContent).toBe("All sprints");
    expect(hero?.querySelector(".lp-hero__subtitle")?.textContent).toContain("Nov 1 to Nov 14");
    expect(hero?.querySelector(".lp-hero__actions button")?.textContent).toBe("New item");
  });
});
