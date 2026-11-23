import type { MouseEvent } from "react";
import { Button, type MantineSize } from "@mantine/core";

export type DeleteButtonProps = {
  onConfirm: () => void;
  confirmMessage?: string;
  label?: string;
  "aria-label"?: string;
  size?: MantineSize;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
};

/**
 * Standardized destructive delete button shared across USM, OST, RAID, and KANO views and modals.
 * Stops click propagation so inline table/card triggers never open parent row/card drawers.
 */
export function DeleteButton({
  onConfirm,
  confirmMessage,
  label = "Delete",
  "aria-label": ariaLabel,
  size = "sm",
  disabled,
  loading,
  className,
}: DeleteButtonProps) {
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    onConfirm();
  };

  return (
    <Button
      type="button"
      variant="outline"
      color="red"
      size={size}
      disabled={disabled}
      loading={loading}
      className={className}
      aria-label={ariaLabel ?? label}
      onClick={handleClick}
    >
      {label}
    </Button>
  );
}
