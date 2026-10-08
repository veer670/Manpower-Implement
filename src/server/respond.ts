import { NextResponse } from "next/server";
import { HttpError } from "./auth";

/**
 * One error shape for every route.
 *
 * A deployment whose database has not been attached yet fails on the first
 * query with a message about DATABASE_URL. Letting that surface as a generic
 * 500 sends people hunting for a bug in the login; naming it points them at
 * the setup step that is actually missing.
 */
export function fail(where: string, err: unknown): NextResponse {
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }

  const message = err instanceof Error ? err.message : String(err);

  if (message.includes("DATABASE_URL")) {
    // The fix differs by where you are standing, and sending someone to the
    // wrong one costs more than the message saves.
    const error =
      process.env.NODE_ENV === "development"
        ? "No database is connected. Copy .env.example to .env.local and put your " +
          "Postgres connection string in DATABASE_URL, then restart the dev server."
        : "This site has no database attached yet. Attach one and set DATABASE_URL " +
          "in the project's environment variables.";
    return NextResponse.json({ error }, { status: 503 });
  }

  console.error(`${where}:`, err);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}
