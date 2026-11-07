import { requireApiRole } from "@backend/lib/auth";
import { jsonError } from "@backend/lib/http-error";
import {
  formatJudgingZodError,
  judgeFeedbackSchema,
} from "@backend/lib/validations/judging.schema";
import { upsertFeedback } from "@backend/services/judging/judging.service";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: { submissionId: string } },
) {
  try {
    const session = await requireApiRole("JUDGE");
    const parsed = judgeFeedbackSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(formatJudgingZodError(parsed.error), { status: 400 });
    }
    const feedback = await upsertFeedback(
      params.submissionId,
      session.userId,
      session.role,
      parsed.data,
    );
    return NextResponse.json(feedback);
  } catch (error) {
    return jsonError(error);
  }
}
