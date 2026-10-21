import { requireApiRole } from "@backend/lib/auth";
import { closeEvent } from "@backend/services/events/judging.service";
import { NextRequest, NextResponse } from "next/server";
import { judgingErrorResponse } from "../judging/errors";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireApiRole("ORGANIZER");
    const result = await closeEvent(params.id, session.userId);
    return NextResponse.json(result);
  } catch (error) {
    return judgingErrorResponse(error);
  }
}
