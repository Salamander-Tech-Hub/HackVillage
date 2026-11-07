import { requireApiRole } from "@backend/lib/auth";
import { jsonError } from "@backend/lib/http-error";
import { listEventPayouts, runPayoutPhase } from "@backend/services/money/payout.service";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  phase: z.enum(["INSTANT_50", "MILESTONE_50"]),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireApiRole("ORGANIZER");
    const payouts = await listEventPayouts({
      eventId: params.id,
      actorId: session.userId,
      actorRole: session.role,
    });
    return NextResponse.json({ payouts });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireApiRole("ORGANIZER");
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Choose INSTANT_50 or MILESTONE_50." } },
        { status: 400 },
      );
    }
    const result = await runPayoutPhase({
      eventId: params.id,
      actorId: session.userId,
      actorRole: session.role,
      phase: parsed.data.phase,
    });
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
