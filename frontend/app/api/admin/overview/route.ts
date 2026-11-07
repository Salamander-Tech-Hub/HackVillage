import { requireApiRole } from "@backend/lib/auth";
import { jsonError } from "@backend/lib/http-error";
import {
  getAdminOverview,
  listAdminAudit,
  listFailedPayouts,
  listRecentTransitions,
} from "@backend/services/admin/admin.service";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await requireApiRole("ADMIN");
    const [overview, audit, failedPayouts, transitions] = await Promise.all([
      getAdminOverview(),
      listAdminAudit(),
      listFailedPayouts(),
      listRecentTransitions(),
    ]);
    return NextResponse.json({ overview, audit, failedPayouts, transitions });
  } catch (error) {
    return jsonError(error);
  }
}
