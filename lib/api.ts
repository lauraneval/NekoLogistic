import { z } from "zod";
import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        message,
        details,
      },
    },
    { status },
  );
}

export async function parseJson<TSchema extends z.ZodTypeAny>(
  req: Request,
  schema: TSchema,
) {
  const body = await req.json();
  return schema.safeParse(body);
}
