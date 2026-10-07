import { NextResponse } from "next/server";
import { getAccess } from "@/server/auth";

/** Who the caller is, and what they may do. The client renders from this. */
export async function GET() {
  const access = await getAccess();
  return NextResponse.json({
    session: access.session,
    canManageRoster: access.canManageRoster,
    canManageLogins: access.canManageLogins,
    category: access.category,
    contractorId: access.contractorId,
  });
}
