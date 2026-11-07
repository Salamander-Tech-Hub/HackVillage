import { requireApiRole } from "@backend/lib/auth";
import { jsonError } from "@backend/lib/http-error";
import { listJudgeAssignments } from "@backend/services/judging/judging.service";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await requireApiRole("JUDGE");
    const events = await listJudgeAssignments(session.userId);
    return NextResponse.json({ events });
  } catch (error) {
    return jsonError(error);
  }
}
