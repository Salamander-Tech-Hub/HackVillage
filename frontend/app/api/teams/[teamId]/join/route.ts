import { requireApiRole } from "@backend/lib/auth";
import { jsonError } from "@backend/lib/http-error";
import { joinTeam } from "@backend/services/participation/participation.service";
import { NextResponse } from "next/server";

export async function POST(
  _req: Request,
  { params }: { params: { teamId: string } },
) {
  try {
    const session = await requireApiRole("DEVELOPER");
    const team = await joinTeam(params.teamId, session.userId);
    return NextResponse.json(team);
  } catch (error) {
    return jsonError(error);
  }
}
