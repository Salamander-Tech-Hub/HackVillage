import { requireApiRole } from "@backend/lib/auth";
import { jsonError } from "@backend/lib/http-error";
import { recoverPayout } from "@backend/services/admin/admin.service";
import { NextResponse } from "next/server";

export async function POST(
  _req: Request,
  { params }: { params: { payoutId: string } },
) {
  try {
    const session = await requireApiRole("ADMIN");
    const payout = await recoverPayout(session.userId, params.payoutId);
    return NextResponse.json({ payout });
  } catch (error) {
    return jsonError(error);
  }
}
