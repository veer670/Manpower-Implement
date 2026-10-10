import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { fail as respondFail } from "@/server/respond";
import { HttpError, requireSession } from "@/server/auth";
import { getDb } from "@/server/db";
import { contractors, entries } from "@/server/schema";

/** The contractor ids this login may read or write. null means all of them. */
async function scopeIds(
  category: string | null,
  type: string | null,
  contractorId: string | null,
): Promise<string[] | null> {
  if (contractorId) return [contractorId];
  if (!category) return null;
  const db = await getDb();
  const rows = await db
    .select({ id: contractors.id })
    .from(contractors)
    .where(
      type
        ? and(eq(contractors.category, category), eq(contractors.type, type))
        : eq(contractors.category, category),
    );
  return rows.map((r: { id: string }) => r.id);
}

/** GET /api/entries?from=YYYY-MM-DD&to=YYYY-MM-DD */
export async function GET(request: Request) {
  try {
    const db = await getDb();
    const access = await requireSession();
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    const ids = await scopeIds(access.category, access.type, access.contractorId);
    if (ids?.length === 0) return NextResponse.json({ entries: [] });

    const where = [
      ids ? inArray(entries.contractorId, ids) : undefined,
      from ? gte(entries.date, from) : undefined,
      to ? lte(entries.date, to) : undefined,
    ].filter(Boolean);

    const rows = where.length
      ? await db
          .select()
          .from(entries)
          .where(and(...where))
      : await db.select().from(entries);

    return NextResponse.json({ entries: rows });
  } catch (err) {
    return respondFail("entries route", err);
  }
}

/**
 * PUT — save one day.
 *
 * The body carries every contractor the form showed, each with a count or
 * null. Only those ids are touched, which is what lets a contractor save their
 * own row without clearing the rest of the day; and a null is a delete, so
 * "not entered" stays distinct from a reported zero.
 */
export async function PUT(request: Request) {
  try {
    const db = await getDb();
    const access = await requireSession();
    const body = (await request.json()) as {
      date?: string;
      actuals?: Record<string, number | null>;
    };

    const date = body.date?.trim() ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpError(400, "A valid date is needed.");

    const actuals = body.actuals ?? {};
    const ids = Object.keys(actuals);
    if (ids.length === 0) return NextResponse.json({ ok: true, written: 0 });

    // Never trust the client's idea of what it may write.
    const allowed = await scopeIds(access.category, access.type, access.contractorId);
    if (allowed) {
      const permitted = new Set(allowed);
      const refused = ids.filter((id) => !permitted.has(id));
      if (refused.length) throw new HttpError(403, "Some of those contractors are out of scope.");
    }

    // Every id in the body is in scope, so clearing them first is safe and
    // makes a null mean "not entered" rather than leaving a stale figure.
    await db.delete(entries).where(and(eq(entries.date, date), inArray(entries.contractorId, ids)));

    const rows = ids
      .filter((id) => actuals[id] != null)
      .map((id) => ({ date, contractorId: id, actual: Math.round(actuals[id] as number) }));

    if (rows.length) await db.insert(entries).values(rows);

    return NextResponse.json({ ok: true, written: rows.length });
  } catch (err) {
    return respondFail("entries route", err);
  }
}
