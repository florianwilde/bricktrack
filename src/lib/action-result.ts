import type { z } from 'zod';

/**
 * Uniform return shape for every server action, so the client always knows
 * where to find the error message and never has to catch exceptions.
 */
export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function actionError(error: string, fieldErrors?: Record<string, string>) {
  return { ok: false as const, error, fieldErrors };
}

export function actionOk(): { ok: true } {
  return { ok: true };
}

export function actionData<T>(data: T): { ok: true; data: T } {
  return { ok: true, data };
}

/** Turns FormData into a plain object; repeated keys become arrays. */
export function formToObject(formData: FormData): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of formData.entries()) {
    if (value instanceof File) continue;
    const existing = result[key];
    if (existing === undefined) {
      result[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      result[key] = [existing, value];
    }
  }

  return result;
}

/**
 * Runs a zod schema against form input and maps the first message per field
 * into a shape the forms can render.
 */
export function parseForm<Schema extends z.ZodType>(
  schema: Schema,
  input: unknown,
): { ok: true; data: z.output<Schema> } | { ok: false; error: string; fieldErrors: Record<string, string> } {
  const parsed = schema.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };

  const fieldErrors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path.join('.') || '_';
    fieldErrors[key] ??= issue.message;
  }

  return {
    ok: false,
    error: Object.values(fieldErrors)[0] ?? 'Die Eingaben sind unvollständig.',
    fieldErrors,
  };
}
