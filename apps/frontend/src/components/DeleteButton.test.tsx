// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { describe, expect, it, vi } from "vitest";
import { DeleteButton } from "./DeleteButton";

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

describe("DeleteButton", () => {
  it("stops event propagation and invokes onConfirm when confirmed", () => {
    const parentClick = vi.fn();
    const onConfirm = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <MantineProvider>
          <div onClick={parentClick}>
            <DeleteButton onConfirm={onConfirm} confirmMessage="Delete item?" />
          </div>
        </MantineProvider>,
      );
    });

    const btn = container.querySelector('button[aria-label="Delete"]') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    expect(btn.type).toBe("button");

    act(() => {
      btn.click();
    });

    expect(parentClick).not.toHaveBeenCalled();
    expect(window.confirm).toHaveBeenCalledWith("Delete item?");
    expect(onConfirm).toHaveBeenCalledTimes(1);

    act(() => root.unmount());
    container.remove();
  });

  it("does not invoke onConfirm when confirmation is cancelled", () => {
    const onConfirm = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(false);

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <MantineProvider>
          <DeleteButton onConfirm={onConfirm} confirmMessage="Delete item?" />
        </MantineProvider>,
      );
    });

    const btn = container.querySelector('button[aria-label="Delete"]') as HTMLButtonElement;
    act(() => {
      btn.click();
    });

    expect(onConfirm).not.toHaveBeenCalled();

    act(() => root.unmount());
    container.remove();
  });
});
