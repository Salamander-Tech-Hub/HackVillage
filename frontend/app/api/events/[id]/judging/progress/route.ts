import { requireApiRole } from "@backend/lib/auth";
import { jsonError } from "@backend/lib/http-error";
import { getOrganizerJudgingProgress } from "@backend/services/judging/judging.service";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireApiRole("ORGANIZER");
    const progress = await getOrganizerJudgingProgress(
      params.id,
      session.userId,
      session.role,
    );
    return NextResponse.json(progress);
  } catch (error) {
    return jsonError(error);
  }
}
