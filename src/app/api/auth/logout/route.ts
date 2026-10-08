import { NextResponse } from "next/server";
import { destroySession } from "@/server/auth";

export async function POST() {
  try {
    await destroySession();
  } catch {
    // Signing out must never fail: the cookie is gone either way.
  }
  return NextResponse.json({ ok: true });
}
