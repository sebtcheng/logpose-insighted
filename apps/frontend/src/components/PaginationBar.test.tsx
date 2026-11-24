// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_PAGE_SIZE, PaginationBar, paginateItems } from "./PaginationBar";

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

describe("paginateItems & PaginationBar", () => {
  it("slices 20 items per page by default and clamps out-of-range pages", () => {
    const items = Array.from({ length: 45 }, (_, i) => i + 1);
    const p1 = paginateItems(items, 1);
    expect(p1.items).toHaveLength(DEFAULT_PAGE_SIZE);
    expect(p1.start).toBe(1);
    expect(p1.end).toBe(20);
    expect(p1.totalPages).toBe(3);

    const p3 = paginateItems(items, 99);
    expect(p3.page).toBe(3);
    expect(p3.items).toEqual([41, 42, 43, 44, 45]);
  });

  it("hides PaginationBar when total <= pageSize and navigates when > pageSize", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const onPageChange = vi.fn();

    act(() => {
      root.render(
        <MantineProvider>
          <PaginationBar page={1} total={20} onPageChange={onPageChange} />
        </MantineProvider>,
      );
    });
    expect(container.querySelector('[data-testid="pagination-bar"]')).toBeNull();

    act(() => {
      root.render(
        <MantineProvider>
          <PaginationBar page={1} total={25} onPageChange={onPageChange} />
        </MantineProvider>,
      );
    });
    expect(container.querySelector('[data-testid="pagination-bar"]')?.textContent).toContain(
      "1–20 of 25",
    );
    const nextBtn = [...container.querySelectorAll("button")].find((b) => b.textContent === "Next");
    act(() => nextBtn?.click());
    expect(onPageChange).toHaveBeenCalledWith(2);

    act(() => root.unmount());
    container.remove();
  });
});
