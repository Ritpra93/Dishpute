import { NextResponse } from "next/server";
import type { ZodType, ZodIssue } from "zod";

/**
 * Parse + validate a JSON request body against a zod schema.
 *
 * Returns either `{ ok: true, data }` for use in the route, or `{ ok: false, response }`
 * which the caller should `return` directly. The error response carries an `issues`
 * field shaped like `{ path, message }[]` so clients see what was wrong without us
 * leaking internals.
 */
export async function parseJson<T>(
  request: Request,
  schema: ZodType<T>
): Promise<
  | { ok: true; data: T }
  | { ok: false; response: NextResponse }
> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      ),
    };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "Invalid request body",
          issues: result.error.issues.map((i: ZodIssue) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 }
      ),
    };
  }
  return { ok: true, data: result.data };
}

/**
 * Validate a single value (typically a route param) against a schema.
 * Returns the parsed value or a 400 response.
 */
export function parseParam<T>(
  value: unknown,
  schema: ZodType<T>,
  paramName: string
):
  | { ok: true; data: T }
  | { ok: false; response: NextResponse } {
  const result = schema.safeParse(value);
  if (!result.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `Invalid ${paramName}` },
        { status: 400 }
      ),
    };
  }
  return { ok: true, data: result.data };
}
