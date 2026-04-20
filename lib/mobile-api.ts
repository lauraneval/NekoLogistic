import { NextResponse } from "next/server";

export function mobileOk(data: unknown, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function mobileMessage(message: string, status = 200, data?: unknown) {
  return NextResponse.json(data ? { message, data } : { message }, { status });
}

export function mobileError(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}
