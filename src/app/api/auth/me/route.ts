import { NextResponse } from "next/server";
import { getAccess } from "@/server/auth";
import { fail } from "@/server/respond";

/** Who the caller is, and what they may do. The client renders from this. */
export async function GET() {
  try {
    const access = await getAccess();
    return NextResponse.json({
      session: access.session,
      canManageRoster: access.canManageRoster,
      canManageLogins: access.canManageLogins,
      category: access.category,
      type: access.type,
      contractorId: access.contractorId,
      // Nobody actually signed in — the open door let them through.
      open: access.session?.open === true,
    });
  } catch (err) {
    return fail("me route", err);
  }
}
