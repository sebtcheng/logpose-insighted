import { useMemo } from "react";
import { Select } from "@mantine/core";
import { formatRefSprintLabel, manilaToday, resolveStoredSprint } from "@myapp/shared";
import { useRefSprints } from "../api/lookups";

/** Draft value for a stored row: its sprint key, or the sprint containing a legacy date; "" when unassigned. */
export const sprintDraftValue = (
  sprintKey: string | null | undefined,
  targetDate: string | null | undefined,
): string => resolveStoredSprint(sprintKey, targetDate)?.key ?? "";

/**
 * Weekly sprint picker (Monday-Sunday, Asia/Manila). Every option shows the sprint number and the Sunday it ends.
 * The current value is always kept in the list so editing an old item never drops its sprint.
 */
const TODAY = manilaToday();

export function SprintSelect({
  value,
  onChange,
  clearable = true,
  required,
  disabled,
  width = 270,
  label,
  "aria-label": ariaLabel,
}: {
  disabled?: boolean;
  /** Sprint key (`YYYY-Snn`), or "" when unassigned. */
  value: string;
  onChange: (key: string) => void;
  /** Offer an empty/unassigned option; false where a deadline is required. */
  clearable?: boolean;
  required?: boolean;
  width?: number | string;
  label?: string;
  "aria-label": string;
}) {
  const { data: sprints } = useRefSprints();
  const data = useMemo(() => {
    const options = (sprints ?? [])
      .filter((s) => s.deadline >= TODAY)
      .map((s) => ({
        value: s.sprintKey,
        label: formatRefSprintLabel(s),
      }));
    return options;
  }, [sprints]);
  return (
    <Select
      aria-label={ariaLabel}
      label={label}
      placeholder="Sprint"
      w={width}
      searchable
      clearable={clearable}
      allowDeselect={clearable}
      required={required}
      disabled={disabled}
      data={data}
      value={value || null}
      onChange={(v) => onChange(v ?? "")}
      comboboxProps={{ width: 320 }}
    />
  );
}
