import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { fail as respondFail } from "@/server/respond";
import { hashPassword, HttpError, requireLogins } from "@/server/auth";
import { db } from "@/server/db";
import { contractors, users } from "@/server/schema";

/** Lowercase, no exotic characters — these get typed on a phone. */
function normalise(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, ".")
    .replace(/^[.]+|[.]+$/g, "");
}

/** Readable aloud: no l/i/o/0/1, which get misheard over a phone. */
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const generatePassword = (len = 10) =>
  [...randomBytes(len)].map((b) => ALPHABET[b % ALPHABET.length]).join("");

/** GET — the login list. Never returns salts or hashes. */
export async function GET() {
  try {
    await requireLogins();
    const rows = await db
      .select({
        username: users.username,
        role: users.role,
        contractorId: users.contractorId,
        category: users.category,
        createdAt: users.createdAt,
      })
      .from(users);
    return NextResponse.json({ users: rows });
  } catch (err) {
    return respondFail("users route", err);
  }
}

/** POST — issue a login, or reset one's password. */
export async function POST(request: Request) {
  try {
    await requireLogins();
    const body = (await request.json()) as {
      action?: "create" | "reset";
      username?: string;
      password?: string;
      role?: "admin" | "contractor";
      contractorId?: string | null;
      category?: string | null;
    };

    const username = normalise(body.username ?? "");
    if (username.length < 3) throw new HttpError(400, "User ID needs at least 3 characters.");

    const password = body.password?.trim() || generatePassword();
    if (password.length < 6) throw new HttpError(400, "Password needs at least 6 characters.");

    const [existing] = await db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (body.action === "reset") {
      if (!existing) throw new HttpError(404, "No such login.");
      const { salt, hash } = await hashPassword(password);
      await db.update(users).set({ salt, hash }).where(eq(users.username, username));
      // Returned once, so the office can pass it on. It is a hash from here.
      return NextResponse.json({ username, password });
    }

    if (existing) throw new HttpError(409, `User ID "${username}" is already taken.`);

    if (body.role === "contractor") {
      const id = body.contractorId ?? "";
      const [row] = await db
        .select({ id: contractors.id })
        .from(contractors)
        .where(eq(contractors.id, id))
        .limit(1);
      if (!row) throw new HttpError(400, "Pick a contractor first.");

      const { salt, hash } = await hashPassword(password);
      await db.insert(users).values({
        username,
        role: "contractor",
        contractorId: id,
        salt,
        hash,
      });
      return NextResponse.json({ username, password }, { status: 201 });
    }

    const { salt, hash } = await hashPassword(password);
    await db.insert(users).values({
      username,
      role: "admin",
      category: body.category?.trim() || null,
      salt,
      hash,
    });
    return NextResponse.json({ username, password }, { status: 201 });
  } catch (err) {
    return respondFail("users route", err);
  }
}

/** DELETE — revoke a login. Its sessions cascade with it. */
export async function DELETE(request: Request) {
  try {
    const access = await requireLogins();
    const body = (await request.json()) as { username?: string };
    const username = normalise(body.username ?? "");

    if (username === access.session?.username) {
      throw new HttpError(400, "You cannot delete the login you are signed in with.");
    }

    await db.delete(users).where(eq(users.username, username));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return respondFail("users route", err);
  }
}
