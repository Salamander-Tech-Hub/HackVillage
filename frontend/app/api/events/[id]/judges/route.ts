import { requireApiRole } from "@backend/lib/auth";
import { jsonError } from "@backend/lib/http-error";
import {
  assignJudgeSchema,
  formatJudgingZodError,
} from "@backend/lib/validations/judging.schema";
import { assignJudge, listEventJudges } from "@backend/services/judging/judging.service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireApiRole("ORGANIZER", "JUDGE");
    const judges = await listEventJudges(params.id);
    return NextResponse.json({ judges });
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
    const parsed = assignJudgeSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(formatJudgingZodError(parsed.error), { status: 400 });
    }
    const assignment = await assignJudge(
      params.id,
      session.userId,
      session.role,
      parsed.data.email,
    );
    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
