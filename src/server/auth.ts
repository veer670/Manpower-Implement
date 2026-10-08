import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "./db";
import { sessions, users } from "./schema";

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

export const SESSION_COOKIE = "manpower_session";
const SESSION_DAYS = 14;

/* ----------------------------------------------------------- passwords */

/**
 * scrypt, run on the server. The browser never sees the hash, let alone the
 * password — which is the whole difference between this and keeping logins in
 * localStorage.
 */
export async function hashPassword(password: string): Promise<{ salt: string; hash: string }> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return { salt: salt.toString("hex"), hash: hash.toString("hex") };
}

export async function verifyPassword(
  password: string,
  salt: string,
  expected: string,
): Promise<boolean> {
  const hash = await scrypt(password, Buffer.from(salt, "hex"), 64);
  const want = Buffer.from(expected, "hex");
  // Lengths must match before timingSafeEqual, which throws otherwise.
  return hash.length === want.length && timingSafeEqual(hash, want);
}

/* ------------------------------------------------------------ sessions */

export type Role = "office" | "admin" | "contractor";

export type Session = {
  username: string;
  role: Role;
  /** Set for role "contractor". */
  contractorId: string | null;
  /** Set for role "admin"; null means every category. */
  category: string | null;
};

export async function createSession(username: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ token, username, expiresAt });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true, // script on the page cannot read it
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  return token;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.token, token));
  jar.delete(SESSION_COOKIE);
}

/**
 * The signed-in user, or null. Reads the session row every time rather than
 * trusting anything in the cookie beyond the opaque token, so deleting the row
 * revokes the session immediately.
 */
/**
 * On a developer's own machine, skip the login.
 *
 * Gated on NODE_ENV === "development", which only `next dev` sets: `next
 * build`, `next start` and every Vercel deployment are "production", so this
 * cannot reach a deployed site however the code is bundled. Set
 * REQUIRE_LOGIN=1 in .env.local to exercise the real flow locally.
 */
function localBypass(): Session | null {
  if (process.env.NODE_ENV !== "development") return null;
  if (process.env.REQUIRE_LOGIN === "1") return null;
  return { username: "localhost", role: "office", contractorId: null, category: null };
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  // Before the query, so localhost needs no session row — and no database — to
  // get past the door.
  if (!token) return localBypass();

  const rows = await db
    .select({
      username: users.username,
      role: users.role,
      contractorId: users.contractorId,
      category: users.category,
    })
    .from(sessions)
    .innerJoin(users, eq(users.username, sessions.username))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);

  const row = rows[0];
  if (!row) return localBypass();
  return {
    username: row.username,
    role: row.role as Role,
    contractorId: row.contractorId,
    category: row.category,
  };
}

/* ------------------------------------------------------- authorisation */

export type Access = {
  session: Session | null;
  /** May issue and revoke logins. */
  canManageLogins: boolean;
  /** May add, rename, reorder and delete roster rows. */
  canManageRoster: boolean;
  /** Null means every category. */
  category: string | null;
  /** Set only for a contractor login. */
  contractorId: string | null;
};

export function accessFor(session: Session | null): Access {
  if (!session) {
    return {
      session,
      canManageLogins: false,
      canManageRoster: false,
      category: null,
      contractorId: null,
    };
  }
  if (session.role === "office") {
    return {
      session,
      canManageLogins: true,
      canManageRoster: true,
      category: null,
      contractorId: null,
    };
  }
  if (session.role === "admin") {
    return {
      session,
      canManageLogins: false,
      canManageRoster: true,
      category: session.category,
      contractorId: null,
    };
  }
  return {
    session,
    canManageLogins: false,
    canManageRoster: false,
    category: null,
    contractorId: session.contractorId,
  };
}

export async function getAccess(): Promise<Access> {
  return accessFor(await getSession());
}

/** Thrown by the guards below and turned into a status code by the route. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function requireSession(): Promise<Access> {
  const access = await getAccess();
  if (!access.session) throw new HttpError(401, "Sign in first.");
  return access;
}

export async function requireRoster(): Promise<Access> {
  const access = await requireSession();
  if (!access.canManageRoster) throw new HttpError(403, "Not allowed.");
  return access;
}

export async function requireLogins(): Promise<Access> {
  const access = await requireSession();
  if (!access.canManageLogins) throw new HttpError(403, "Not allowed.");
  return access;
}

/**
 * An admin login may only touch its own category. Checked on the server for
 * every write, because the client's idea of what it may see is a convenience,
 * not a boundary.
 */
export function assertCategory(access: Access, category: string): void {
  if (access.category && access.category !== category) {
    throw new HttpError(403, "That category is outside this login's scope.");
  }
}
