import { requireApiRole } from "@backend/lib/auth";
import { jsonError } from "@backend/lib/http-error";
import { listEventPayouts, retryPayout } from "@backend/services/money/payout.service";
import { NextResponse } from "next/server";

export async function POST(
  _req: Request,
  { params }: { params: { id: string; payoutId: string } },
) {
  try {
    const session = await requireApiRole("ORGANIZER");
    const payouts = await listEventPayouts({
      eventId: params.id,
      actorId: session.userId,
      actorRole: session.role,
    });
    const payout = payouts.find((item) => item.id === params.payoutId);

    if (!payout) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Payout not found for this event." } },
        { status: 404 },
      );
    }
    if (payout.status !== "FAILED") {
      return NextResponse.json(
        { error: { code: "PRECONDITION_FAILED", message: "Only failed payouts can be retried." } },
        { status: 409 },
      );
    }

    const retried = await retryPayout(payout.id);
    return NextResponse.json({
      payout: {
        id: retried.id,
        phase: retried.phase,
        status: retried.status,
        amountKes: Number(retried.amountKes),
        transferCode: retried.paystackTransferCode,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
