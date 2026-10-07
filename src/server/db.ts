import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type Database = NeonHttpDatabase<typeof schema>;

let instance: Database | null = null;

function connect(): Database {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and paste your " +
        "Postgres connection string into it.",
    );
  }
  // The HTTP driver, not a TCP pool: serverless functions do not live long
  // enough to amortise a pool, and one pool per invocation exhausts the
  // database's connection limit under any real traffic.
  return drizzle(neon(url), { schema });
}

/**
 * Connects on first query rather than on import.
 *
 * `next build` evaluates every route module to collect its configuration, so
 * a module-scope connection would make the build fail on any machine without
 * a database — including CI, which has no business holding the credential.
 */
export const db = new Proxy({} as Database, {
  get(_target, prop) {
    instance ??= connect();
    return Reflect.get(instance, prop, instance);
  },
});
