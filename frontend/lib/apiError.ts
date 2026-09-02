/*
  FastAPI reports failures in two different shapes on the same `detail` key

  A raised HTTPException sends a string: {"detail": "User profile not found"}
  A request validation failure sends an array of objects instead:
  {"detail": [{"loc": ["query", "payload"], "msg": "Field required", ...}]}

  Interpolating the array straight into a template literal renders
  "[object Object]", which is how a 422 ends up unreadable in the console
 */

/* One entry of FastAPI's request validation error array */
interface ValidationIssue {
  loc?: (string | number)[];
  msg?: string;
}

function isValidationIssue(value: unknown): value is ValidationIssue {
  return typeof value === 'object' && value !== null;
}

/* Render a validation entry as "body.is_completed: Field required" */
function formatIssue(issue: ValidationIssue): string {
  const path = Array.isArray(issue.loc) ? issue.loc.join('.') : '';
  const message = issue.msg ?? 'Invalid value';
  return path ? `${path}: ${message}` : message;
}

/* Turn any shape of FastAPI `detail` into a single readable line */
export function formatDetail(detail: unknown, fallback: string): string {
  if (typeof detail === 'string' && detail.trim() !== '') return detail;

  if (Array.isArray(detail)) {
    const lines = detail.filter(isValidationIssue).map(formatIssue);
    if (lines.length > 0) return lines.join('; ');
  }

  return fallback;
}

/* Message for a failed response, prefixed with what the caller was attempting */
export function apiErrorMessage(
  action: string,
  status: number,
  statusText: string,
  detail: unknown,
): string {
  return `${action}: ${status} ${formatDetail(detail, statusText || 'Request failed')}`;
}
