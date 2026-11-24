// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { describe, expect, it } from "vitest";
import type { HomeResponse } from "@myapp/shared";
import { Header, getSprintProgressColor } from "./HomePage";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
if (!window.matchMedia) {
  window.matchMedia = () =>
    ({
      matches: false,
      media: "",
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

function makeHome(overrides?: Partial<HomeResponse>): HomeResponse {
  return {
    timezone: "Asia/Manila",
    activeSprint: {
      id: "s1",
      sprintKey: "S48",
      sprintNumber: 48,
      name: "Sprint 48",
      goal: "Sprint 48",
      startDate: "2026-11-16",
      endDate: "2026-11-29",
      daysLeft: 6,
    },
    wip: { inProgress: 0 },
    carryOver: { count: 3 },
    thisWeek: [],
    nextWeek: [],
    thisMonth: [],
    later: [],
    upcomingReleases: [],
    moduleItems: { thisWeek: [], nextWeek: [], thisMonth: [], later: [] },
    summary: {
      total: 41,
      completed: 4,
      incomplete: 37,
      completionRate: 10,
      ongoing: 37,
      onTime: 41,
      delayed: 0,
      unscheduled: 0,
    },
    sprintSummary: {
      total: 41,
      completed: 4,
      incomplete: 37,
      completionRate: 10,
      ongoing: 37,
      onTime: 41,
      delayed: 0,
      unscheduled: 0,
    },
    truncated: false,
    ...overrides,
  };
}

describe("HomePage Header (Sprint Telemetry Card)", () => {
  it("renders the two-zone telemetry panels with inline days-left, square percentage badge, combined progress bar, and no backlog banner", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        <MantineProvider>
          <Header data={makeHome()} />
        </MantineProvider>,
      );
    });

    expect(container.querySelector('[data-testid="sprint-hero-panel"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="task-breakdown-panel"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="sprint-donut"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="wip-rail"]')).toBeNull();
    expect(container.querySelector('[data-testid="sprint-days-left"]')?.textContent).toContain("6");
    expect(container.querySelector('[data-testid="sprint-backlog"]')).toBeNull();
    expect(container.querySelector('[data-testid="sprint-progress-summary"]')?.textContent).toBe(
      "4 of 44 tasks completed",
    );
    expect(
      container.querySelector('[data-testid="sprint-progress-backlog-label"]')?.textContent,
    ).toBe("3 backlogs");
    expect(container.querySelector('[data-testid="sprint-progress-pct"]')?.textContent).toBe(
      "9.1%",
    );
    const pctBadge = container.querySelector('[data-testid="sprint-progress-pct"]') as HTMLElement;
    expect(pctBadge.style.color).not.toBe("");
    expect(container.querySelector('[data-testid="sprint-progress-backlog-bar"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="kpi-tile-ongoing"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="kpi-tile-completed"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="kpi-tile-on-time"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="kpi-tile-delayed"]')).not.toBeNull();

    act(() => root.unmount());
    container.remove();
  });

  it("omits the red backlog segment when carryOver count is 0 and guards against division by zero", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <MantineProvider>
          <Header data={makeHome({ carryOver: { count: 0 } })} />
        </MantineProvider>,
      );
    });
    expect(container.querySelector('[data-testid="sprint-progress-backlog-bar"]')).toBeNull();
    expect(container.querySelector('[data-testid="sprint-progress-backlog-label"]')).toBeNull();
    expect(container.querySelector('[data-testid="sprint-progress-summary"]')?.textContent).toBe(
      "4 of 41 tasks completed",
    );

    act(() => {
      root.render(
        <MantineProvider>
          <Header data={makeHome({ carryOver: { count: 1 } })} />
        </MantineProvider>,
      );
    });
    expect(
      container.querySelector('[data-testid="sprint-progress-backlog-label"]')?.textContent,
    ).toBe("1 backlog");

    act(() => {
      root.render(
        <MantineProvider>
          <Header
            data={makeHome({
              carryOver: { count: 0 },
              sprintSummary: {
                total: 0,
                completed: 0,
                incomplete: 0,
                completionRate: 0,
                ongoing: 0,
                onTime: 0,
                delayed: 0,
                unscheduled: 0,
              },
            })}
          />
        </MantineProvider>,
      );
    });
    expect(container.querySelector('[data-testid="sprint-progress-pct"]')?.textContent).toBe("0%");
    expect(container.querySelector('[data-testid="sprint-progress-summary"]')?.textContent).toBe(
      "0 of 0 tasks completed",
    );
    expect(container.querySelector('[data-testid="sprint-progress-backlog-bar"]')).toBeNull();

    act(() => root.unmount());
    container.remove();
  });

  it("styles the Delayed tile with the danger tint at 0 and when > 0", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <MantineProvider>
          <Header data={makeHome()} />
        </MantineProvider>,
      );
    });
    const zeroTile = container.querySelector('[data-testid="kpi-tile-delayed"]') as HTMLElement;
    expect(zeroTile.style.backgroundColor).toBe("rgba(255, 158, 163, 0.08)");

    act(() => {
      root.render(
        <MantineProvider>
          <Header
            data={makeHome({
              sprintSummary: {
                total: 10,
                completed: 2,
                incomplete: 8,
                completionRate: 20,
                ongoing: 5,
                onTime: 7,
                delayed: 3,
                unscheduled: 0,
              },
            })}
          />
        </MantineProvider>,
      );
    });
    const delayedTile = container.querySelector('[data-testid="kpi-tile-delayed"]') as HTMLElement;
    expect(delayedTile.style.backgroundColor).toBe("rgba(255, 158, 163, 0.08)");

    act(() => root.unmount());
    container.remove();
  });

  it("maps completion percentage continuously from red (0%) to green (100%) with clamping", () => {
    expect(getSprintProgressColor(0).hue).toBe(0);
    expect(getSprintProgressColor(50).hue).toBe(60);
    expect(getSprintProgressColor(100).hue).toBe(120);
    expect(getSprintProgressColor(-15).hue).toBe(0);
    expect(getSprintProgressColor(150).hue).toBe(120);
    expect(getSprintProgressColor(Number.NaN).hue).toBe(0);
  });
});
