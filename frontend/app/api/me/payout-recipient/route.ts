import { requireApiRole } from "@backend/lib/auth";
import { jsonError } from "@backend/lib/http-error";
import { getRecipient, upsertRecipient } from "@backend/services/money/recipient.service";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  type: z.enum(["MPESA", "BANK"]),
  account: z.string().min(6),
  displayName: z.string().min(2).max(80),
});

export async function GET() {
  try {
    const session = await requireApiRole("DEVELOPER");
    const recipient = await getRecipient(session.userId);
    return NextResponse.json({ recipient });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireApiRole("DEVELOPER");
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Provide a payout type, account, and name." } },
        { status: 400 },
      );
    }
    const recipient = await upsertRecipient(session.userId, parsed.data);
    return NextResponse.json({ recipient });
  } catch (error) {
    return jsonError(error);
  }
}
