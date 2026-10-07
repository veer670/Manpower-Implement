/**
 * Per-contractor logins.
 *
 * IMPORTANT: this app has no server. These credentials decide what a signed-in
 * person *sees and can edit*, which is genuinely useful — but they cannot keep
 * anyone out, because everything is readable from the browser's own storage.
 * Passwords are still stored as PBKDF2 hashes rather than plaintext, so the
 * model ports to a real backend unchanged and nobody's reused password leaks.
 */

const USERS_KEY = "manpower.users.v1";
const SESSION_KEY = "manpower.session.v1";

const ITERATIONS = 150_000;

export type User = {
  username: string;
  /** The contractor this login may enter manpower for. */
  contractorId: string;
  salt: string;
  hash: string;
  createdAt: string;
};

export type Session = {
  username: string;
  contractorId: string;
};

const toHex = (buf: ArrayBuffer): string =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

async function derive(password: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = Uint8Array.from(saltHex.match(/.{2}/g) ?? [], (b) => parseInt(b, 16));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    key,
    256,
  );
  return toHex(bits);
}

function newSalt(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
}

/* ------------------------------------------------------------------ store */

const NO_USERS: User[] = [];

function readUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return NO_USERS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as User[]) : NO_USERS;
  } catch {
    return NO_USERS;
  }
}

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

// Read once at module load on the client, as the dataset store does, so React
// hydrates against the server snapshot and switches afterwards.
let users: User[] = typeof window === "undefined" ? NO_USERS : readUsers();
let session: Session | null = typeof window === "undefined" ? null : readSession();

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getUsers = (): User[] => users;
export const getServerUsers = (): User[] => NO_USERS;

export const getSession = (): Session | null => session;
export const getServerSession = (): Session | null => null;

function persistUsers(next: User[]) {
  users = next;
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(next));
  } catch {
    // Quota or private mode: the change holds for this session only.
  }
  emit();
}

function persistSession(next: Session | null) {
  session = next;
  try {
    if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* as above */
  }
  emit();
}

/* ----------------------------------------------------------------- actions */

export const usernameTaken = (username: string): boolean =>
  users.some((u) => u.username === normaliseUsername(username));

export const userForContractor = (contractorId: string): User | undefined =>
  users.find((u) => u.contractorId === contractorId);

/** Lowercase, spaces to dots, nothing exotic — these get typed on a phone. */
export function normaliseUsername(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, ".")
    .replace(/^[.]+|[.]+$/g, "");
}

/** A suggestion derived from the contractor's name, as the user asked for. */
export function suggestUsername(contractorName: string): string {
  return normaliseUsername(contractorName);
}

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // no l/i/o/0/1 — misread aloud

export function generatePassword(length = 10): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join("");
}

export async function createUser(
  username: string,
  password: string,
  contractorId: string,
): Promise<void> {
  const name = normaliseUsername(username);
  const salt = newSalt();
  const hash = await derive(password, salt);
  const next = users.filter((u) => u.username !== name && u.contractorId !== contractorId);
  persistUsers([
    ...next,
    { username: name, contractorId, salt, hash, createdAt: new Date().toISOString() },
  ]);
}

export async function resetPassword(username: string, password: string): Promise<void> {
  const salt = newSalt();
  const hash = await derive(password, salt);
  persistUsers(users.map((u) => (u.username === username ? { ...u, salt, hash } : u)));
}

export function deleteUser(username: string): void {
  persistUsers(users.filter((u) => u.username !== username));
  if (session?.username === username) persistSession(null);
}

/** Resolves to the session on success, or null when the credentials are wrong. */
export async function signIn(username: string, password: string): Promise<Session | null> {
  const name = normaliseUsername(username);
  const user = users.find((u) => u.username === name);
  if (!user) return null;
  const hash = await derive(password, user.salt);
  // Constant-time-ish compare. The real protection is server-side; this just
  // avoids an obviously timing-leaky early return.
  if (hash.length !== user.hash.length) return null;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ user.hash.charCodeAt(i);
  if (diff !== 0) return null;

  const next: Session = { username: user.username, contractorId: user.contractorId };
  persistSession(next);
  return next;
}

export function signOut(): void {
  persistSession(null);
}

/** Drop logins whose contractor is no longer on the roster. */
export function pruneUsers(liveContractorIds: Set<string>): void {
  const kept = users.filter((u) => liveContractorIds.has(u.contractorId));
  if (kept.length !== users.length) persistUsers(kept);
}
