import { getSession, requireApiRole } from "@backend/lib/auth";
import { jsonError } from "@backend/lib/http-error";
import { canListJudges } from "@backend/services/events/access";
import { loadEventAccessFacts } from "@backend/services/events/access.queries";
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
    const session = await getSession();
    const facts = await loadEventAccessFacts(params.id, session);
    if (!facts) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Event not found" } }, { status: 404 });
    }
    const decision = canListJudges(facts);
    if (!decision.allowed) {
      const status = decision.reason === "UNAUTHORIZED" ? 401 : 403;
      return NextResponse.json(
        { error: { code: decision.reason, message: "You cannot view these judges" } },
        { status },
      );
    }
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
