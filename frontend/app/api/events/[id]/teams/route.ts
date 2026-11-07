import { getSession, requireApiRole } from "@backend/lib/auth";
import { jsonError } from "@backend/lib/http-error";
import { canListTeams } from "@backend/services/events/access";
import { loadEventAccessFacts } from "@backend/services/events/access.queries";
import {
  createTeamSchema,
  formatParticipationZodError,
} from "@backend/lib/validations/participation.schema";
import {
  createTeam,
  listEventTeams,
} from "@backend/services/participation/participation.service";
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
    const decision = canListTeams(facts);
    if (!decision.allowed) {
      const status = decision.reason === "UNAUTHORIZED" ? 401 : 403;
      return NextResponse.json(
        { error: { code: decision.reason, message: "You cannot view these teams" } },
        { status },
      );
    }
    const teams = await listEventTeams(params.id);
    return NextResponse.json({ teams });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireApiRole("DEVELOPER");
    const parsed = createTeamSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(formatParticipationZodError(parsed.error), { status: 400 });
    }
    const team = await createTeam(params.id, session.userId, parsed.data.name);
    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
