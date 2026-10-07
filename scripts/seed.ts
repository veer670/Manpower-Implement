/**
 * Sets the database up for first use:
 *   npm run db:migrate   — create the tables
 *   npm run db:seed      — load the sample roster and the first office login
 *
 * Re-running the seed is safe: it skips anything already there rather than
 * duplicating it, and never overwrites a password.
 */
import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";
import { contractors, displayOrder, entries, users } from "../src/server/schema";
import { sampleContractors, sampleEntries } from "../src/lib/sample";
import { SAMPLE_CATEGORY_ORDER, SAMPLE_TYPE_ORDER } from "../src/lib/sample";

const scrypt = promisify(scryptCb) as (p: string, s: Buffer, k: number) => Promise<Buffer>;

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "\nDATABASE_URL is not set.\n\n" +
      "  1. Copy .env.example to .env.local\n" +
      "  2. Paste your Postgres connection string into it\n",
  );
  process.exit(1);
}

const db = drizzle(neon(url));

/** Readable aloud: no l/i/o/0/1, which get misheard over a phone. */
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const generatePassword = (len = 12) =>
  [...randomBytes(len)].map((b) => ALPHABET[b % ALPHABET.length]).join("");

async function main() {
  const existingUsers = await db.select({ username: users.username }).from(users).limit(1);
  const existingRoster = await db.select({ id: contractors.id }).from(contractors).limit(1);

  if (existingRoster.length === 0) {
    const roster = sampleContractors();
    await db.insert(contractors).values(roster);

    const rows = sampleEntries().map((e) => ({
      date: e.date,
      contractorId: e.contractorId,
      actual: e.actual,
    }));
    // Chunked: a single statement with ~240 rows is fine, but the seed grows
    // with the sample and the HTTP driver has a payload ceiling.
    for (let i = 0; i < rows.length; i += 200) {
      await db.insert(entries).values(rows.slice(i, i + 200));
    }

    await db.insert(displayOrder).values([
      ...Object.entries(SAMPLE_CATEGORY_ORDER).map(([key, srNo]) => ({
        scope: "category",
        key,
        srNo,
      })),
      ...Object.entries(SAMPLE_TYPE_ORDER).map(([key, srNo]) => ({ scope: "type", key, srNo })),
    ]);

    console.log(`Seeded ${roster.length} contractors and ${rows.length} daily entries.`);
  } else {
    console.log("Roster already present — left alone.");
  }

  if (existingUsers.length === 0) {
    const username = process.env.SEED_ADMIN_USER?.trim() || "office";
    const password = process.env.SEED_ADMIN_PASSWORD?.trim() || generatePassword();
    const salt = randomBytes(16);
    const hash = await scrypt(password, salt, 64);

    await db.insert(users).values({
      username,
      role: "office",
      salt: salt.toString("hex"),
      hash: hash.toString("hex"),
    });

    console.log("\n  ┌─────────────────────────────────────────────┐");
    console.log("  │  Office login created — write this down     │");
    console.log("  └─────────────────────────────────────────────┘");
    console.log(`     User ID:   ${username}`);
    console.log(`     Password:  ${password}\n`);
    console.log("  It is stored hashed and cannot be shown again.");
    console.log("  Sign in, then issue admin and contractor logins under More.\n");
  } else {
    console.log("Users already present — no new office login created.");
  }

  // Cheap proof the connection really worked, rather than a silent no-op.
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contractors);
  console.log(`Done. ${count} contractors in the database.`);
}

main().catch((err) => {
  console.error("\nSeed failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
