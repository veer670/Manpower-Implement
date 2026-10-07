import {
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * The roster, three levels deep. Only the contractor is a row: categories and
 * types exist as columns on it, exactly as they did in the browser-only
 * version, so one with nobody under it simply stops existing.
 *
 * `id` stays the derived `category__type__name` slug rather than a surrogate
 * key. It is what the client already keys everything by, and it keeps a
 * re-imported sheet matching the rows it replaces.
 */
export const contractors = pgTable(
  "contractors",
  {
    id: text("id").primaryKey(),
    category: text("category").notNull(),
    type: text("type").notNull(),
    name: text("name").notNull(),
    committed: integer("committed").notNull(),
    srNo: integer("sr_no").notNull().default(1),
    site: text("site"),
  },
  (t) => [index("contractors_category_idx").on(t.category, t.type)],
);

/**
 * One day's reported manpower for one contractor. A missing row means "not
 * entered", which is deliberately distinct from a row holding zero.
 */
export const entries = pgTable(
  "entries",
  {
    date: date("date").notNull(),
    contractorId: text("contractor_id")
      .notNull()
      .references(() => contractors.id, { onDelete: "cascade", onUpdate: "cascade" }),
    actual: integer("actual").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.date, t.contractorId] }),
    index("entries_date_idx").on(t.date),
  ],
);

/**
 * Display order for the two levels that are not rows of their own.
 * scope is "category" or "type"; for a type the key is `category::type`.
 */
export const displayOrder = pgTable(
  "display_order",
  {
    scope: text("scope").notNull(),
    key: text("key").notNull(),
    srNo: integer("sr_no").notNull(),
  },
  (t) => [primaryKey({ columns: [t.scope, t.key] })],
);

/**
 * Logins. `role` is "office", "admin" or "contractor":
 *  - office     — everything, including issuing logins
 *  - admin      — one category (or all, when category is null), no logins
 *  - contractor — its own row only
 *
 * The hash is scrypt, derived server-side. The client never sees it, which is
 * the whole difference between this and the browser-only version.
 */
export const users = pgTable("users", {
  username: text("username").primaryKey(),
  role: text("role").notNull(),
  contractorId: text("contractor_id").references(() => contractors.id, {
    onDelete: "cascade",
    onUpdate: "cascade",
  }),
  category: text("category"),
  salt: text("salt").notNull(),
  hash: text("hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Server-side sessions. The cookie carries only an opaque token, so a stolen
 * cookie can be revoked by deleting the row — which a signed stateless cookie
 * could not offer.
 */
export const sessions = pgTable(
  "sessions",
  {
    token: text("token").primaryKey(),
    username: text("username")
      .notNull()
      .references(() => users.username, { onDelete: "cascade", onUpdate: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("sessions_username_idx").on(t.username)],
);

export type ContractorRow = typeof contractors.$inferSelect;
export type EntryRow = typeof entries.$inferSelect;
export type UserRow = typeof users.$inferSelect;
