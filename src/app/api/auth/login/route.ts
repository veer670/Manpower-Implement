import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createSession, verifyPassword } from "@/server/auth";
import { db } from "@/server/db";
import { users } from "@/server/schema";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    username?: string;
    password?: string;
  } | null;

  const username = body?.username?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";

  // One message for both a wrong ID and a wrong password: naming which was
  // wrong tells an outsider which IDs exist.
  const reject = () =>
    NextResponse.json({ error: "That user ID and password do not match." }, { status: 401 });

  if (!username || !password) return reject();

  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (!user) return reject();

  const ok = await verifyPassword(password, user.salt, user.hash);
  if (!ok) return reject();

  await createSession(user.username);

  return NextResponse.json({
    username: user.username,
    role: user.role,
    contractorId: user.contractorId,
    category: user.category,
  });
}
