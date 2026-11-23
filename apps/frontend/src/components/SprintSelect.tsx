import { useMemo } from "react";
import { Select } from "@mantine/core";
import { formatRefSprintLabel, resolveStoredSprint, sprintFromKey } from "@myapp/shared";
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
    const options = (sprints ?? []).map((s) => ({
      value: s.sprintKey,
      label: formatRefSprintLabel(s),
    }));
    // An already-assigned sprint outside the fetched window stays selectable so editing never drops it.
    const kept = value && !options.some((o) => o.value === value) ? sprintFromKey(value) : null;
    if (kept) {
      options.push({
        value: kept.key,
        label: formatRefSprintLabel({ sprintNumber: kept.number, deadline: kept.endDate }),
      });
      options.sort((a, b) => a.value.localeCompare(b.value));
    }
    return options;
  }, [sprints, value]);
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
