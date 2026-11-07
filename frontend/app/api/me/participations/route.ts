import { requireApiRole } from "@backend/lib/auth";
import { jsonError } from "@backend/lib/http-error";
import { listMyParticipations } from "@backend/services/participation/participation.service";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await requireApiRole("DEVELOPER");
    const participations = await listMyParticipations(session.userId);
    return NextResponse.json({ participations });
  } catch (error) {
    return jsonError(error);
  }
}
