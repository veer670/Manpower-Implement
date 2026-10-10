import { api } from "./api";

/**
 * The client half of authentication. It holds no secret: the password goes
 * straight to the server, the session lives in an httpOnly cookie this code
 * cannot read, and what comes back is only who you are and what you may do.
 */

export type UserRole = "office" | "admin" | "contractor";

export type Session = {
  username: string;
  role: UserRole;
  /** role "contractor" */
  contractorId?: string | null;
  /** role "admin"; null means every category */
  category?: string | null;
  /** role "admin"; null means every type within that category */
  type?: string | null;
};

export type User = {
  username: string;
  role: UserRole;
  contractorId: string | null;
  category: string | null;
  /** Narrows an admin to one type within its category. */
  type: string | null;
  createdAt: string;
};

export type Access = {
  session: Session | null;
  canManageRoster: boolean;
  canManageLogins: boolean;
  category: string | null;
  /** Null means every type within the category. */
  type: string | null;
  contractorId: string | null;
};

const SIGNED_OUT: Access = {
  session: null,
  canManageRoster: false,
  canManageLogins: false,
  category: null,
  type: null,
  contractorId: null,
};

let access: Access = SIGNED_OUT;
let users: User[] = [];
let ready = false;

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getAccess = (): Access => access;
export const getServerAccess = (): Access => SIGNED_OUT;
export const getUsers = (): User[] => users;
export const getServerUsers = (): User[] => [];
export const isReady = (): boolean => ready;

/** Ask the server who we are. Called once at mount and after each sign-in. */
export async function refresh(): Promise<Access> {
  try {
    access = await api.get<Access>("/api/auth/me");
  } catch {
    // Unreachable server or no database: treat as signed out rather than
    // guessing at permissions.
    access = SIGNED_OUT;
  }
  ready = true;
  emit();
  return access;
}

export async function signIn(username: string, password: string): Promise<Session> {
  const session = await api.post<Session>("/api/auth/login", { username, password });
  await refresh();
  return session;
}

export async function signOut(): Promise<void> {
  await api.post("/api/auth/logout").catch(() => {});
  users = [];
  await refresh();
}

/* --------------------------------------------------------------- logins */

export async function loadUsers(): Promise<void> {
  try {
    const body = await api.get<{ users: User[] }>("/api/users");
    users = body.users;
  } catch {
    users = [];
  }
  emit();
}

/** Both of these return the password once — it is a hash from then on. */
export async function createContractorUser(
  username: string,
  password: string,
  contractorId: string,
): Promise<{ username: string; password: string }> {
  const issued = await api.post<{ username: string; password: string }>("/api/users", {
    action: "create",
    role: "contractor",
    username,
    password,
    contractorId,
  });
  await loadUsers();
  return issued;
}

export async function createAdminUser(
  username: string,
  password: string,
  category: string | null,
  type: string | null = null,
): Promise<{ username: string; password: string }> {
  const issued = await api.post<{ username: string; password: string }>("/api/users", {
    action: "create",
    role: "admin",
    username,
    password,
    category,
    type,
  });
  await loadUsers();
  return issued;
}

export async function resetPassword(
  username: string,
  password: string,
): Promise<{ username: string; password: string }> {
  const issued = await api.post<{ username: string; password: string }>("/api/users", {
    action: "reset",
    username,
    password,
  });
  await loadUsers();
  return issued;
}

export async function deleteUser(username: string): Promise<void> {
  await api.del("/api/users", { username });
  await loadUsers();
}

/* --------------------------------------------------------------- helpers */

/** Lowercase, no exotic characters — these get typed on a phone. */
export function normaliseUsername(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, ".")
    .replace(/^[.]+|[.]+$/g, "");
}

export const suggestUsername = (name: string): string => normaliseUsername(name);

export const usernameTaken = (username: string): boolean =>
  users.some((u) => u.username === normaliseUsername(username));

/** Readable aloud: no l/i/o/0/1, which get misheard over a phone. */
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export function generatePassword(length = 10): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join("");
}
