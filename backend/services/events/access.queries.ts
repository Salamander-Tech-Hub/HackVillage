import { prisma } from "@backend/lib/db";
import type { AuthSession } from "@backend/lib/session";
import type { EventAccessFacts } from "@backend/services/events/access";

/** Loads the facts the access rules need. Returns null if the event doesn't exist. */
export async function loadEventAccessFacts(
  eventId: string,
  session: AuthSession | null,
): Promise<EventAccessFacts | null> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { organizerId: true, status: true },
  });
  if (!event) return null;

  if (!session) {
    return {
      event,
      viewer: null,
      isAssignedJudge: false,
      isRegisteredParticipant: false,
    };
  }

  const [assignment, membership] = await Promise.all([
    prisma.judgeAssignment.findUnique({
      where: { eventId_judgeId: { eventId, judgeId: session.userId } },
      select: { id: true },
    }),
    // Team membership is the participant signal this schema can prove.
    prisma.teamMember.findFirst({
      where: { userId: session.userId, team: { eventId } },
      select: { id: true },
    }),
  ]);

  return {
    event,
    viewer: { userId: session.userId, role: session.role },
    isAssignedJudge: assignment !== null,
    isRegisteredParticipant: membership !== null,
  };
}
