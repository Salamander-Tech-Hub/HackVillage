import { getSession, hasRole, requireApiRole } from "@backend/lib/auth";
import { prisma } from "@backend/lib/db";
import { jsonError } from "@backend/lib/http-error";
import { JudgingError } from "@backend/services/judging/judging";
import { listEventSubmissions } from "@backend/services/participation/participation.service";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    await requireApiRole("DEVELOPER", "ORGANIZER", "JUDGE");
    const session = await getSession();
    if (!session) {
      throw new JudgingError("FORBIDDEN", "Sign in is required.");
    }

    const event = await prisma.event.findUnique({
      where: { id: params.id },
      select: { organizerId: true },
    });
    if (!event) {
      throw new JudgingError("NOT_FOUND", "Event not found");
    }

    const isOwner = event.organizerId === session.userId || session.role === "ADMIN";
    const isJudge =
      hasRole(session, "JUDGE") &&
      Boolean(
        await prisma.judgeAssignment.findUnique({
          where: { eventId_judgeId: { eventId: params.id, judgeId: session.userId } },
        }),
      );
    const isParticipant = Boolean(
      await prisma.eventRegistration.findUnique({
        where: { eventId_userId: { eventId: params.id, userId: session.userId } },
      }),
    );

    if (!isOwner && !isJudge && !isParticipant) {
      throw new JudgingError("FORBIDDEN", "You cannot view submissions for this event.");
    }

    const submissions = await listEventSubmissions(params.id);
    return NextResponse.json({ submissions });
  } catch (error) {
    return jsonError(error);
  }
}
