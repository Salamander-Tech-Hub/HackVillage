import { requireApiRole } from "@backend/lib/auth";
import { jsonError } from "@backend/lib/http-error";
import { declareWinners } from "@backend/services/money/payout.service";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  submissionIds: z.array(z.string().min(1)).min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireApiRole("ORGANIZER");
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Select at least one winning submission." } },
        { status: 400 },
      );
    }
    const winners = await declareWinners({
      eventId: params.id,
      actorId: session.userId,
      actorRole: session.role,
      submissionIds: parsed.data.submissionIds,
    });
    return NextResponse.json({ winners });
  } catch (error) {
    return jsonError(error);
  }
}
