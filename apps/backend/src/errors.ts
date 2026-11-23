import type { ApiError } from "@myapp/shared";

export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const unauthorized = (message = "Sign in required") =>
  new AppError(401, "unauthorized", message);
export const forbidden = (message = "You do not have permission to do that") =>
  new AppError(403, "forbidden", message);
export const notFound = (what = "Resource") => new AppError(404, "not_found", `${what} not found`);
export const conflict = (message: string, details?: unknown) =>
  new AppError(409, "conflict", message, details);
export const unprocessable = (message: string, details?: unknown) =>
  new AppError(422, "unprocessable", message, details);
export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, "bad_request", message, details);

export type PgErrorShape = { code: string; constraint?: string; detail?: string };

/** Drizzle wraps driver errors; walk the cause chain to find the PostgreSQL error. */
export function pgErrorOf(err: unknown): PgErrorShape | null {
  let cur: unknown = err;
  for (let i = 0; i < 5 && cur && typeof cur === "object"; i += 1) {
    const maybe = cur as {
      code?: unknown;
      constraint?: unknown;
      detail?: unknown;
      cause?: unknown;
    };
    if (typeof maybe.code === "string" && /^[0-9A-Z]{5}$/.test(maybe.code)) {
      return {
        code: maybe.code,
        constraint: typeof maybe.constraint === "string" ? maybe.constraint : undefined,
        detail: typeof maybe.detail === "string" ? maybe.detail : undefined,
      };
    }
    cur = maybe.cause;
  }
  return null;
}

const CONSTRAINT_MESSAGES: Record<string, [number, string]> = {
  usm_step_features_sprint_key_sprints_sprint_key_fk: [422, "Unknown sprint"],
  ost_solutions_sprint_key_sprints_sprint_key_fk: [422, "Unknown sprint"],
  kano_request_specs_sprint_key_sprints_sprint_key_fk: [422, "Unknown sprint"],
  raid_mitigating_actions_sprint_key_sprints_sprint_key_fk: [422, "Unknown sprint"],
  activities_done_is_100: [422, "An activity must be 100% complete to be done"],
  activities_percent_range: [422, "Percent complete must be between 0 and 100"],
  activities_blocked_has_reason: [422, "A blocked activity needs a reason"],
  activities_done_has_completed_at: [422, "Done status and completion time must agree"],
  activities_project_subproject_fk: [422, "That subproject belongs to a different project"],
  activities_project_sprint_fk: [422, "That sprint belongs to a different project"],
  activities_project_release_fk: [422, "That release belongs to a different project"],
  releases_one_mvp_per_project: [409, "This project already has an MVP release"],
  releases_project_name_uq: [409, "A release with that name already exists in this project"],
  sprint_member_capacity_nonneg: [422, "Capacity cannot be negative"],
  gate_overrides_reason_not_empty: [422, "An override needs a reason"],
  sprint_scope_changes_reason_not_empty: [422, "A scope change needs a reason"],
  activity_dependencies_distinct: [422, "An activity cannot depend on itself"],
  sprints_project_subproject_fk: [422, "That subproject belongs to a different project"],
  sprints_one_active_per_scope: [409, "There is already an active sprint for that scope"],
  sprints_dates_ordered: [422, "A sprint cannot end before it starts"],
  sprints_project_name_uq: [409, "A sprint with that name already exists in this project"],
  projects_code_lower_uq: [409, "A project with that code already exists"],
  subprojects_project_code_uq: [409, "A subproject with that code already exists"],
  users_email_lower_uq: [409, "A user with that email already exists"],
  tags_name_lower_uq: [409, "A tag with that name already exists"],
  tags_color_hex: [422, "Tag color must look like #RRGGBB"],
  activity_comments_body_not_empty: [422, "A comment cannot be empty"],
};

/** Turns database constraint violations into 4xx errors; returns null if not a constraint error. */
export function translatePgError(err: unknown): AppError | null {
  const pg = pgErrorOf(err);
  if (!pg) return null;
  const known = pg.constraint ? CONSTRAINT_MESSAGES[pg.constraint] : undefined;
  if (known)
    return new AppError(known[0], known[0] === 409 ? "conflict" : "unprocessable", known[1]);
  switch (pg.code) {
    case "23505":
      return conflict("That value already exists");
    case "23503":
      return unprocessable("A referenced record does not exist or is still in use");
    case "23502":
    case "23514":
      return unprocessable("A value failed validation");
    case "22P02":
      return badRequest("A value had the wrong format");
    case "57014":
      return new AppError(503, "timeout", "The request took too long, please retry");
    default:
      return null;
  }
}

export function toErrorBody(err: AppError): ApiError {
  return {
    error: {
      code: err.code,
      message: err.message,
      ...(err.details === undefined ? {} : { details: err.details }),
    },
  };
}
