import { requireApiRole } from "@backend/lib/auth";
import { readOptionalEnv } from "@backend/lib/env";
import { jsonError } from "@backend/lib/http-error";
import { initializePrizeDeposit } from "@backend/services/money/escrow.service";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireApiRole("ORGANIZER");
    const origin = (readOptionalEnv("NEXTAUTH_URL") ?? new URL(req.url).origin).replace(/\/$/, "");
    const checkout = await initializePrizeDeposit({
      eventId: params.id,
      actorId: session.userId,
      actorRole: session.role,
      organizerEmail: session.email,
      callbackUrl: `${origin}/organizer/events/${encodeURIComponent(params.id)}?deposit=pending`,
    });
    return NextResponse.json(checkout, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
