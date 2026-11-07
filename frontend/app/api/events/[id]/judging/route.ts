import { requireApiRole } from "@backend/lib/auth";
import { jsonError } from "@backend/lib/http-error";
import { listJudgeQueue } from "@backend/services/judging/judging.service";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireApiRole("JUDGE");
    const queue = await listJudgeQueue(params.id, session.userId, session.role);
    return NextResponse.json(queue);
  } catch (error) {
    return jsonError(error);
  }
}
