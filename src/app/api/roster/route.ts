import { and, eq, inArray, like } from "drizzle-orm";
import { NextResponse } from "next/server";
import { fail as respondFail } from "@/server/respond";
import { assertScope, HttpError, requireRoster, requireSession } from "@/server/auth";
import { getDb } from "@/server/db";
import { contractors, displayOrder, entries } from "@/server/schema";
import { contractorId, typeKey } from "@/lib/types";

/**
 * The roster, as one endpoint.
 *
 * Several shapes of write share one authorisation path on purpose: the scope
 * check an admin login depends on is easy to forget when it has to be repeated
 * across a dozen route files, and forgetting it once is the whole bug.
 */

/** GET — the roster this login may see. */
export async function GET() {
  try {
    const db = await getDb();
    const access = await requireSession();

    const rows = access.category
      ? await db
          .select()
          .from(contractors)
          .where(
            access.type
              ? and(
                  eq(contractors.category, access.category),
                  eq(contractors.type, access.type),
                )
              : eq(contractors.category, access.category),
          )
      : access.contractorId
        ? await db.select().from(contractors).where(eq(contractors.id, access.contractorId))
        : await db.select().from(contractors);

    const order = await db.select().from(displayOrder);

    return NextResponse.json({
      contractors: rows,
      categoryOrder: Object.fromEntries(
        order.filter((o) => o.scope === "category").map((o) => [o.key, o.srNo]),
      ),
      typeOrder: Object.fromEntries(
        order.filter((o) => o.scope === "type").map((o) => [o.key, o.srNo]),
      ),
    });
  } catch (err) {
    return respondFail("roster route", err);
  }
}

/** POST — add a contractor, creating its category and type by implication. */
export async function POST(request: Request) {
  try {
    const db = await getDb();
    const access = await requireRoster();
    const body = (await request.json()) as {
      category?: string;
      type?: string;
      name?: string;
      committed?: number;
      site?: string | null;
    };

    const category = body.category?.trim() ?? "";
    const type = body.type?.trim() ?? "";
    const name = body.name?.trim() ?? "";
    const committed = Number(body.committed);

    if (!category || !type || !name) {
      throw new HttpError(400, "Category, contractor type and name are all needed.");
    }
    if (!Number.isFinite(committed) || committed < 0) {
      throw new HttpError(400, "Committed must be a number.");
    }
    assertScope(access, category, type);

    const id = contractorId(category, type, name);
    const [clash] = await db
      .select({ id: contractors.id })
      .from(contractors)
      .where(eq(contractors.id, id))
      .limit(1);
    if (clash) throw new HttpError(409, `${name} is already on the roster under ${type}.`);

    // Lands at the end of its type; the Sr. No. box reorders it afterwards.
    const siblings = await db
      .select({ id: contractors.id })
      .from(contractors)
      .where(and(eq(contractors.category, category), eq(contractors.type, type)));

    const row = {
      id,
      category,
      type,
      name,
      committed: Math.round(committed),
      srNo: siblings.length + 1,
      site: body.site?.trim() || null,
    };
    await db.insert(contractors).values(row);
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    return respondFail("roster route", err);
  }
}

type Patch =
  | { kind: "contractor"; id: string; name?: string; committed?: number; srNo?: number }
  | { kind: "category"; category: string; name?: string; srNo?: number }
  | { kind: "type"; category: string; type: string; name?: string; srNo?: number };

/** PATCH — rename or reorder at any of the three levels. */
export async function PATCH(request: Request) {
  try {
    const db = await getDb();
    const access = await requireRoster();
    const body = (await request.json()) as Patch;

    if (body.kind === "contractor") {
      const [row] = await db
        .select()
        .from(contractors)
        .where(eq(contractors.id, body.id))
        .limit(1);
      if (!row) throw new HttpError(404, "No such contractor.");
      assertScope(access, row.category, row.type);

      const name = body.name?.trim();
      // The id is derived from the name, so a rename mints a new one. The
      // entries table cascades on update, which is why that is safe here and
      // had to be migrated by hand in the browser-only version.
      const nextId = name ? contractorId(row.category, row.type, name) : row.id;
      if (nextId !== row.id) {
        const [clash] = await db
          .select({ id: contractors.id })
          .from(contractors)
          .where(eq(contractors.id, nextId))
          .limit(1);
        if (clash) throw new HttpError(409, "That name is taken.");
      }

      await db
        .update(contractors)
        .set({
          ...(name ? { id: nextId, name } : {}),
          ...(body.committed != null ? { committed: Math.round(body.committed) } : {}),
          ...(body.srNo != null ? { srNo: Math.round(body.srNo) } : {}),
        })
        .where(eq(contractors.id, body.id));

      return NextResponse.json({ id: nextId });
    }

    if (body.kind === "category") {
      assertScope(access, body.category);
      const name = body.name?.trim();

      if (body.srNo != null) {
        await db
          .insert(displayOrder)
          .values({ scope: "category", key: name ?? body.category, srNo: Math.round(body.srNo) })
          .onConflictDoUpdate({
            target: [displayOrder.scope, displayOrder.key],
            set: { srNo: Math.round(body.srNo) },
          });
      }

      if (name && name !== body.category) {
        const [clash] = await db
          .select({ id: contractors.id })
          .from(contractors)
          .where(eq(contractors.category, name))
          .limit(1);
        if (clash) throw new HttpError(409, "That name is taken.");

        const affected = await db
          .select()
          .from(contractors)
          .where(eq(contractors.category, body.category));

        for (const row of affected) {
          await db
            .update(contractors)
            .set({ id: contractorId(name, row.type, row.name), category: name })
            .where(eq(contractors.id, row.id));
        }

        // Move the order keys with it: a type key is prefixed by its category.
        await db
          .update(displayOrder)
          .set({ key: name })
          .where(and(eq(displayOrder.scope, "category"), eq(displayOrder.key, body.category)));

        const prefix = typeKey(body.category, "");
        const typeKeys = await db
          .select()
          .from(displayOrder)
          .where(and(eq(displayOrder.scope, "type"), like(displayOrder.key, `${prefix}%`)));
        for (const row of typeKeys) {
          await db
            .update(displayOrder)
            .set({ key: typeKey(name, row.key.slice(prefix.length)) })
            .where(and(eq(displayOrder.scope, "type"), eq(displayOrder.key, row.key)));
        }
      }

      return NextResponse.json({ category: name ?? body.category });
    }

    // kind === "type"
    assertScope(access, body.category, body.kind === "type" ? body.type : undefined);
    const name = body.name?.trim();

    if (body.srNo != null) {
      const key = typeKey(body.category, name ?? body.type);
      await db
        .insert(displayOrder)
        .values({ scope: "type", key, srNo: Math.round(body.srNo) })
        .onConflictDoUpdate({
          target: [displayOrder.scope, displayOrder.key],
          set: { srNo: Math.round(body.srNo) },
        });
    }

    if (name && name !== body.type) {
      const [clash] = await db
        .select({ id: contractors.id })
        .from(contractors)
        .where(and(eq(contractors.category, body.category), eq(contractors.type, name)))
        .limit(1);
      if (clash) throw new HttpError(409, "That name is taken.");

      const affected = await db
        .select()
        .from(contractors)
        .where(and(eq(contractors.category, body.category), eq(contractors.type, body.type)));

      for (const row of affected) {
        await db
          .update(contractors)
          .set({ id: contractorId(row.category, name, row.name), type: name })
          .where(eq(contractors.id, row.id));
      }

      await db
        .update(displayOrder)
        .set({ key: typeKey(body.category, name) })
        .where(
          and(
            eq(displayOrder.scope, "type"),
            eq(displayOrder.key, typeKey(body.category, body.type)),
          ),
        );
    }

    return NextResponse.json({ type: name ?? body.type });
  } catch (err) {
    return respondFail("roster route", err);
  }
}

type Remove =
  | { kind: "contractor"; id: string }
  | { kind: "category"; category: string }
  | { kind: "type"; category: string; type: string };

/** DELETE — remove at any level. Entries cascade; the client confirms first. */
export async function DELETE(request: Request) {
  try {
    const db = await getDb();
    const access = await requireRoster();
    const body = (await request.json()) as Remove;

    if (body.kind === "contractor") {
      const [row] = await db
        .select()
        .from(contractors)
        .where(eq(contractors.id, body.id))
        .limit(1);
      if (!row) return NextResponse.json({ ok: true });
      assertScope(access, row.category, row.type);
      await db.delete(contractors).where(eq(contractors.id, body.id));
      return NextResponse.json({ ok: true });
    }

    if (body.kind === "category") {
      assertScope(access, body.category);
      const doomed = await db
        .select({ id: contractors.id })
        .from(contractors)
        .where(eq(contractors.category, body.category));
      if (doomed.length) {
        await db.delete(entries).where(
          inArray(
            entries.contractorId,
            doomed.map((d) => d.id),
          ),
        );
        await db.delete(contractors).where(eq(contractors.category, body.category));
      }
      await db
        .delete(displayOrder)
        .where(and(eq(displayOrder.scope, "category"), eq(displayOrder.key, body.category)));
      await db
        .delete(displayOrder)
        .where(
          and(
            eq(displayOrder.scope, "type"),
            like(displayOrder.key, `${typeKey(body.category, "")}%`),
          ),
        );
      return NextResponse.json({ ok: true });
    }

    assertScope(access, body.category, body.kind === "type" ? body.type : undefined);
    await db
      .delete(contractors)
      .where(and(eq(contractors.category, body.category), eq(contractors.type, body.type)));
    await db
      .delete(displayOrder)
      .where(
        and(
          eq(displayOrder.scope, "type"),
          eq(displayOrder.key, typeKey(body.category, body.type)),
        ),
      );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return respondFail("roster route", err);
  }
}
