import { prisma } from "@backend/lib/db";
import {
  assertPreconditions,
  assertTransition,
  LifecycleError,
} from "@backend/services/events/lifecycle";
import { EventStatus } from "@prisma/client";

export type JudgeReadinessItem = {
  judgeId: string;
  name: string;
  email: string;
  reviewed: number;
  total: number;
  pending: number;
  isComplete: boolean;
};

export type SubmissionReadinessItem = {
  submissionId: string;
  title: string;
  teamName: string;
  reviewed: number;
  total: number;
  isComplete: boolean;
};

export type JudgingReadiness = {
  eventId: string;
  status: EventStatus;
  totalSubmissions: number;
  totalJudges: number;
  totalReviewsRequired: number;
  totalReviewsCompleted: number;
  percentage: number;
  isReadyToClose: boolean;
  missingReason: string | null;
  judges: JudgeReadinessItem[];
  submissions: SubmissionReadinessItem[];
};

const ROSTER_LOCKED_STATUSES: EventStatus[] = [
  EventStatus.JUDGING,
  EventStatus.CLOSED,
  EventStatus.ARCHIVED,
];

/**
 * Returns per-judge and per-submission reviewed / total counts and judging
 * readiness for an event. Pass `organizerId` to enforce event ownership.
 */
export async function getJudgingReadinessForEvent(
  eventId: string,
  options: { organizerId?: string } = {},
): Promise<JudgingReadiness> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      submissions: {
        select: {
          id: true,
          title: true,
          team: { select: { name: true } },
          feedback: { select: { judgeId: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      judgeAssignments: {
        include: {
          judge: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!event) {
    throw new Error("NOT_FOUND");
  }

  if (options.organizerId && event.organizerId !== options.organizerId) {
    throw new Error("FORBIDDEN");
  }

  const totalSubmissions = event.submissions.length;
  const totalJudges = event.judgeAssignments.length;
  const assignedJudgeIds = new Set(event.judgeAssignments.map((a) => a.judgeId));

  const judges: JudgeReadinessItem[] = event.judgeAssignments.map((assignment) => {
    const judgeId = assignment.judgeId;
    const reviewed = event.submissions.filter((submission) =>
      submission.feedback.some((f) => f.judgeId === judgeId),
    ).length;
    const pending = Math.max(0, totalSubmissions - reviewed);

    return {
      judgeId,
      name: assignment.judge.name || assignment.judge.email.split("@")[0] || "Judge",
      email: assignment.judge.email,
      reviewed,
      total: totalSubmissions,
      pending,
      isComplete: pending === 0,
    };
  });

  // Only feedback from currently assigned judges counts toward a submission.
  const submissions: SubmissionReadinessItem[] = event.submissions.map((submission) => {
    const reviewed = new Set(
      submission.feedback
        .map((f) => f.judgeId)
        .filter((judgeId) => assignedJudgeIds.has(judgeId)),
    ).size;

    return {
      submissionId: submission.id,
      title: submission.title,
      teamName: submission.team?.name ?? "",
      reviewed,
      total: totalJudges,
      isComplete: totalJudges > 0 && reviewed >= totalJudges,
    };
  });

  const totalReviewsRequired = totalJudges * totalSubmissions;
  const totalReviewsCompleted = judges.reduce((acc, j) => acc + j.reviewed, 0);
  const percentage =
    totalReviewsRequired > 0
      ? Math.round((totalReviewsCompleted / totalReviewsRequired) * 100)
      : totalJudges > 0
        ? 100
        : 0;

  const incompleteJudges = judges.filter((j) => !j.isComplete);

  let missingReason: string | null = null;
  if (totalJudges === 0) {
    missingReason = "Assign at least one judge before closing the event.";
  } else if (incompleteJudges.length === 1) {
    const single = incompleteJudges[0];
    missingReason = `Judge ${single.name} has ${single.pending} pending ${
      single.pending === 1 ? "review" : "reviews"
    }.`;
  } else if (incompleteJudges.length > 1) {
    const pendingReviews = totalReviewsRequired - totalReviewsCompleted;
    missingReason = `${pendingReviews} reviews pending across ${incompleteJudges.length} judges.`;
  }

  return {
    eventId: event.id,
    status: event.status,
    totalSubmissions,
    totalJudges,
    totalReviewsRequired,
    totalReviewsCompleted,
    percentage,
    isReadyToClose: missingReason === null,
    missingReason,
    judges,
    submissions,
  };
}

async function findOwnedEvent(eventId: string, organizerId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });

  if (!event) {
    throw new Error("NOT_FOUND");
  }

  if (event.organizerId !== organizerId) {
    throw new Error("FORBIDDEN");
  }

  return event;
}

function assertRosterOpen(status: EventStatus, verb: string): void {
  if (ROSTER_LOCKED_STATUSES.includes(status)) {
    throw new LifecycleError(
      "PRECONDITION_FAILED",
      `Cannot ${verb} a judge after judging has started.`,
    );
  }
}

/**
 * Assigns a judge to an event before judging starts. Creates a JUDGE account
 * for unknown emails; existing accounts must already be judges (or admins)
 * so assignment never changes someone's role.
 */
export async function assignJudgeToEvent(
  eventId: string,
  organizerId: string,
  data: { email: string; name?: string },
): Promise<JudgingReadiness> {
  const event = await findOwnedEvent(eventId, organizerId);
  assertRosterOpen(event.status, "add");

  const email = data.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throw new Error("INVALID_EMAIL");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.role !== "JUDGE" && existing.role !== "ADMIN") {
    throw new Error("NOT_A_JUDGE");
  }

  const judge =
    existing ??
    (await prisma.user.create({
      data: {
        email,
        name: data.name?.trim() || email.split("@")[0],
        role: "JUDGE",
      },
    }));

  await prisma.judgeAssignment.upsert({
    where: { eventId_judgeId: { eventId, judgeId: judge.id } },
    update: {},
    create: { eventId, judgeId: judge.id },
  });

  return getJudgingReadinessForEvent(eventId);
}

/**
 * Removes a judge assignment from an event before judging starts.
 */
export async function removeJudgeFromEvent(
  eventId: string,
  organizerId: string,
  judgeId: string,
): Promise<JudgingReadiness> {
  const event = await findOwnedEvent(eventId, organizerId);
  assertRosterOpen(event.status, "remove");

  await prisma.judgeAssignment.deleteMany({
    where: { eventId, judgeId },
  });

  return getJudgingReadinessForEvent(eventId);
}

/**
 * Closes an event, enforcing that all assigned judges have reviewed every submission.
 */
export async function closeEvent(
  eventId: string,
  organizerId: string,
): Promise<JudgingReadiness> {
  const event = await findOwnedEvent(eventId, organizerId);
  const nextStatus = assertTransition(event.status, "CLOSE");

  const readiness = await getJudgingReadinessForEvent(eventId);
  assertPreconditions("CLOSE", {
    status: event.status,
    title: event.title,
    problemStatement: event.problemStatement,
    prizePoolKes: Number(event.prizePoolKes),
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    escrowState: null,
    judgingReadiness: readiness,
  });

  // Guard on status so a concurrent close or reopen can't be overwritten.
  const { count } = await prisma.event.updateMany({
    where: { id: eventId, status: EventStatus.JUDGING },
    data: { status: nextStatus },
  });
  if (count === 0) {
    throw new LifecycleError(
      "INVALID_TRANSITION",
      "The event changed while closing. Refresh and try again.",
    );
  }

  return { ...readiness, status: nextStatus };
}
