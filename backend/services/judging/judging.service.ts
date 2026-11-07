import { prisma } from "@backend/lib/db";
import {
  assertCanWriteFeedback,
  assertFeedbackPoints,
  judgingProgress,
  judgingReadiness,
  JudgingError,
  type JudgingProgress,
} from "@backend/services/judging/judging";

export type ApiJudgeAssignment = {
  id: string;
  eventId: string;
  judgeId: string;
  judgeEmail: string;
  judgeName: string | null;
};

export type ApiJudgeEvent = {
  id: string;
  slug: string;
  title: string;
  status: string;
  problemStatement: string;
  submissionCount: number;
};

export type ApiFeedback = {
  id: string;
  submissionId: string;
  judgeId: string;
  points: string[];
  score: number | null;
  createdAt: string;
};

export async function getJudgingReadinessForEvent(eventId: string) {
  const [submissions, assignments, reviews] = await Promise.all([
    prisma.submission.findMany({
      where: { eventId },
      select: { id: true },
    }),
    prisma.judgeAssignment.findMany({
      where: { eventId },
      select: { judgeId: true },
    }),
    prisma.judgeFeedback.findMany({
      where: { submission: { eventId } },
      select: { submissionId: true, judgeId: true, points: true },
    }),
  ]);

  return judgingReadiness({
    submissionIds: submissions.map((row) => row.id),
    assignedJudgeIds: assignments.map((row) => row.judgeId),
    reviews,
  });
}

export type OrganizerJudgingProgress = JudgingProgress & {
  eventId: string;
  status: string;
};

export async function getOrganizerJudgingProgress(
  eventId: string,
  actorId: string,
  actorRole: string,
): Promise<OrganizerJudgingProgress> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      submissions: {
        select: { id: true, title: true, team: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
      judgeAssignments: {
        include: { judge: { select: { id: true, name: true, email: true } } },
        orderBy: { id: "asc" },
      },
    },
  });
  if (!event) {
    throw new JudgingError("NOT_FOUND", "Event not found");
  }
  if (event.organizerId !== actorId && actorRole !== "ADMIN") {
    throw new JudgingError("FORBIDDEN", "You do not own this event");
  }

  const reviews = await prisma.judgeFeedback.findMany({
    where: { submission: { eventId } },
    select: { submissionId: true, judgeId: true, points: true },
  });

  const progress = judgingProgress({
    submissions: event.submissions.map((submission) => ({
      id: submission.id,
      title: submission.title,
      teamName: submission.team.name,
    })),
    judges: event.judgeAssignments.map((assignment) => ({
      id: assignment.judge.id,
      name: assignment.judge.name ?? "",
      email: assignment.judge.email,
    })),
    reviews,
  });

  return {
    eventId: event.id,
    status: event.status,
    ...progress,
  };
}

export async function listEventJudges(eventId: string): Promise<ApiJudgeAssignment[]> {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    throw new JudgingError("NOT_FOUND", "Event not found");
  }

  const assignments = await prisma.judgeAssignment.findMany({
    where: { eventId },
    include: { judge: { select: { email: true, name: true } } },
    orderBy: { id: "asc" },
  });

  return assignments.map((assignment) => ({
    id: assignment.id,
    eventId: assignment.eventId,
    judgeId: assignment.judgeId,
    judgeEmail: assignment.judge.email,
    judgeName: assignment.judge.name,
  }));
}

export async function assignJudge(
  eventId: string,
  actorId: string,
  actorRole: string,
  email: string,
): Promise<ApiJudgeAssignment> {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    throw new JudgingError("NOT_FOUND", "Event not found");
  }
  if (event.organizerId !== actorId && actorRole !== "ADMIN") {
    throw new JudgingError("FORBIDDEN", "You do not own this event");
  }
  if (event.status === "CLOSED" || event.status === "ARCHIVED") {
    throw new JudgingError("PRECONDITION_FAILED", "Judges cannot be assigned after the event is closed.");
  }

  const judge = await prisma.user.findUnique({ where: { email } });
  if (!judge || (judge.role !== "JUDGE" && judge.role !== "ADMIN")) {
    throw new JudgingError("PRECONDITION_FAILED", "That account is not a judge.");
  }

  const assignment = await prisma.judgeAssignment.upsert({
    where: { eventId_judgeId: { eventId, judgeId: judge.id } },
    create: { eventId, judgeId: judge.id },
    update: {},
    include: { judge: { select: { email: true, name: true } } },
  });

  return {
    id: assignment.id,
    eventId: assignment.eventId,
    judgeId: assignment.judgeId,
    judgeEmail: assignment.judge.email,
    judgeName: assignment.judge.name,
  };
}

export async function listJudgeAssignments(judgeId: string): Promise<ApiJudgeEvent[]> {
  const assignments = await prisma.judgeAssignment.findMany({
    where: { judgeId },
    include: {
      event: {
        include: { _count: { select: { submissions: true } } },
      },
    },
    orderBy: { event: { createdAt: "desc" } },
  });

  return assignments.map((assignment) => ({
    id: assignment.event.id,
    slug: assignment.event.slug,
    title: assignment.event.title,
    status: assignment.event.status,
    problemStatement: assignment.event.problemStatement,
    submissionCount: assignment.event._count.submissions,
  }));
}

export async function assertAssignedJudge(eventId: string, judgeId: string, role: string) {
  if (role === "ADMIN") return;
  const assignment = await prisma.judgeAssignment.findUnique({
    where: { eventId_judgeId: { eventId, judgeId } },
  });
  if (!assignment) {
    throw new JudgingError("FORBIDDEN", "You are not assigned to this event.");
  }
}

export async function upsertFeedback(
  submissionId: string,
  judgeId: string,
  judgeRole: string,
  input: { points: string[]; score?: number | null },
): Promise<ApiFeedback> {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { event: true },
  });
  if (!submission) {
    throw new JudgingError("NOT_FOUND", "Submission not found");
  }

  await assertAssignedJudge(submission.eventId, judgeId, judgeRole);
  assertCanWriteFeedback(submission.event.status);
  const points = assertFeedbackPoints(input.points);

  const feedback = await prisma.judgeFeedback.upsert({
    where: { submissionId_judgeId: { submissionId, judgeId } },
    create: {
      submissionId,
      judgeId,
      points,
      score: input.score ?? null,
    },
    update: {
      points,
      score: input.score ?? null,
    },
  });

  return {
    id: feedback.id,
    submissionId: feedback.submissionId,
    judgeId: feedback.judgeId,
    points: feedback.points,
    score: feedback.score,
    createdAt: feedback.createdAt.toISOString(),
  };
}

export async function listJudgeQueue(eventId: string, judgeId: string, judgeRole: string) {
  await assertAssignedJudge(eventId, judgeId, judgeRole);

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    throw new JudgingError("NOT_FOUND", "Event not found");
  }

  const submissions = await prisma.submission.findMany({
    where: { eventId },
    include: {
      team: { select: { name: true } },
      feedback: { where: { judgeId } },
    },
    orderBy: { createdAt: "asc" },
  });

  const readiness = await getJudgingReadinessForEvent(eventId);

  return {
    event: {
      id: event.id,
      title: event.title,
      status: event.status,
    },
    readiness,
    submissions: submissions.map((submission) => ({
      id: submission.id,
      title: submission.title,
      teamName: submission.team.name,
      repoUrl: submission.repoUrl,
      demoUrl: submission.demoUrl,
      feedback: submission.feedback[0]
        ? {
            id: submission.feedback[0].id,
            points: submission.feedback[0].points,
            score: submission.feedback[0].score,
          }
        : null,
    })),
  };
}
