import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "./schema";

export type Database =
  | NeonHttpDatabase<typeof schema>
  | PgliteDatabase<typeof schema>;

let instance: Database | null = null;
let connecting: Promise<Database> | null = null;

/**
 * A hosted Postgres when DATABASE_URL is set — which it always is on a
 * deployment — and an embedded one on a developer's machine when it is not.
 *
 * The embedded path is the same Postgres, the same schema and the same
 * migrations, differing only in the driver, so there is no second dialect to
 * keep in step. It exists so `npm run dev` works with nothing to set up.
 */
async function connect(): Promise<Database> {
  const url = process.env.DATABASE_URL;

  if (url) {
    const { neon } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-http");
    // The HTTP driver, not a TCP pool: serverless functions do not live long
    // enough to amortise a pool, and one per invocation exhausts the
    // database's connection limit.
    return drizzle(neon(url), { schema });
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "DATABASE_URL is not set. A deployment needs a hosted Postgres: attach one " +
        "and set DATABASE_URL in the project's environment variables.",
    );
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");

  // Kept on disk so a dev-server restart does not lose the day's entries.
  const client = new PGlite(".pglite");
  const db = drizzle(client, { schema });

  await migrate(db, { migrationsFolder: "./drizzle" });
  await seedIfEmpty(db);

  console.log("[db] using the local embedded Postgres in .pglite");
  return db;
}

/** First run on a fresh machine gets the sample roster rather than a blank app. */
async function seedIfEmpty(db: PgliteDatabase<typeof schema>): Promise<void> {
  const [row] = await db.select({ id: schema.contractors.id }).from(schema.contractors).limit(1);
  if (row) return;

  const { sampleContractors, sampleEntries, SAMPLE_CATEGORY_ORDER, SAMPLE_TYPE_ORDER } =
    await import("@/lib/sample");

  await db.insert(schema.contractors).values(sampleContractors());

  const entries = sampleEntries().map((e) => ({
    date: e.date,
    contractorId: e.contractorId,
    actual: e.actual,
  }));
  for (let i = 0; i < entries.length; i += 200) {
    await db.insert(schema.entries).values(entries.slice(i, i + 200));
  }

  await db.insert(schema.displayOrder).values([
    ...Object.entries(SAMPLE_CATEGORY_ORDER).map(([key, srNo]) => ({
      scope: "category",
      key,
      srNo,
    })),
    ...Object.entries(SAMPLE_TYPE_ORDER).map(([key, srNo]) => ({ scope: "type", key, srNo })),
  ]);

  console.log(`[db] seeded ${entries.length} sample entries`);
}

/**
 * Connects on first use rather than on import: `next build` evaluates every
 * route module to collect its configuration, and a connection at module scope
 * fails the build anywhere without a database.
 */
export async function getDb(): Promise<Database> {
  if (instance) return instance;
  connecting ??= connect().then((db) => {
    instance = db;
    connecting = null;
    return db;
  });
  return connecting;
}
