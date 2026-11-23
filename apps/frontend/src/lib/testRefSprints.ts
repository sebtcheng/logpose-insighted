import { listSprintOptions, type RefSprintDto } from "@myapp/shared";

/** Test stand-in for GET /ref/sprints: the current Manila sprint plus 26 weeks, shaped like ref.sprints rows. */
export const refSprintFixture = (): RefSprintDto[] =>
  listSprintOptions({ weeksAhead: 26 }).map((o, i) => ({
    sprintKey: o.key,
    year: o.year,
    sprintNumber: o.number,
    startDate: o.startDate,
    deadline: o.endDate,
    label: `Sprint ${o.number}`,
    isCurrent: i === 0,
  }));

export const mockUseRefSprints = () => ({ data: refSprintFixture() });
