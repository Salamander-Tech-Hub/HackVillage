import { prisma } from "@backend/lib/db";
import {
  assertOpenForParticipation,
  assertOpenForSubmission,
  normalizeTeamName,
  ParticipationError,
} from "@backend/services/participation/participation";

export type ApiRegistration = {
  id: string;
  eventId: string;
  userId: string;
  createdAt: string;
};

export type ApiTeamMember = {
  userId: string;
  name: string | null;
  email: string;
};

export type ApiTeam = {
  id: string;
  eventId: string;
  name: string;
  createdAt: string;
  members: ApiTeamMember[];
};

export type ApiSubmission = {
  id: string;
  eventId: string;
  teamId: string;
  teamName: string;
  title: string;
  repoUrl: string | null;
  demoUrl: string | null;
  status: string;
  isWinner: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DeveloperParticipation = {
  event: {
    id: string;
    slug: string;
    title: string;
    status: string;
  };
  registrationId: string;
  team: ApiTeam | null;
  submission: ApiSubmission | null;
};

function toTeam(team: {
  id: string;
  eventId: string;
  name: string;
  createdAt: Date;
  members: { userId: string; user: { name: string | null; email: string } }[];
}): ApiTeam {
  return {
    id: team.id,
    eventId: team.eventId,
    name: team.name,
    createdAt: team.createdAt.toISOString(),
    members: team.members.map((member) => ({
      userId: member.userId,
      name: member.user.name,
      email: member.user.email,
    })),
  };
}

function toSubmission(row: {
  id: string;
  eventId: string;
  teamId: string;
  title: string;
  repoUrl: string | null;
  demoUrl: string | null;
  status: string;
  isWinner: boolean;
  createdAt: Date;
  updatedAt: Date;
  team?: { name: string } | null;
}): ApiSubmission {
  return {
    id: row.id,
    eventId: row.eventId,
    teamId: row.teamId,
    teamName: row.team?.name ?? "Untitled team",
    title: row.title,
    repoUrl: row.repoUrl,
    demoUrl: row.demoUrl,
    status: row.status,
    isWinner: row.isWinner,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const teamInclude = {
  members: { include: { user: { select: { name: true, email: true } } } },
} as const;

async function getEventOrThrow(eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    throw new ParticipationError("NOT_FOUND", "Event not found");
  }
  return event;
}

export async function registerForEvent(eventId: string, userId: string): Promise<ApiRegistration> {
  const event = await getEventOrThrow(eventId);
  assertOpenForParticipation(event.status);
  const membership = await prisma.teamMember.findFirst({
    where: { userId, team: { eventId } },
  });
  return {
    id: membership?.id ?? `${eventId}:${userId}`,
    eventId,
    userId,
    createdAt: new Date().toISOString(),
  };
}

export async function getRegistration(
  eventId: string,
  userId: string,
): Promise<{ registered: boolean; registration: ApiRegistration | null }> {
  await getEventOrThrow(eventId);
  const membership = await prisma.teamMember.findFirst({
    where: { userId, team: { eventId } },
  });
  if (!membership) {
    return { registered: false, registration: null };
  }
  return {
    registered: true,
    registration: {
      id: membership.id,
      eventId,
      userId,
      createdAt: new Date().toISOString(),
    },
  };
}

export async function listEventTeams(eventId: string): Promise<ApiTeam[]> {
  await getEventOrThrow(eventId);
  const teams = await prisma.team.findMany({
    where: { eventId },
    orderBy: { createdAt: "asc" },
    include: teamInclude,
  });
  return teams.map(toTeam);
}

export async function createTeam(eventId: string, userId: string, name: string): Promise<ApiTeam> {
  const event = await getEventOrThrow(eventId);
  assertOpenForParticipation(event.status);

  const existingMembership = await prisma.teamMember.findFirst({
    where: { userId, team: { eventId } },
  });
  if (existingMembership) {
    throw new ParticipationError("CONFLICT", "You already belong to a team for this event.");
  }

  const teamName = normalizeTeamName(name);
  const duplicate = await prisma.team.findFirst({
    where: { eventId, name: teamName },
  });
  if (duplicate) {
    throw new ParticipationError("CONFLICT", "A team with that name already exists for this event.");
  }

  const team = await prisma.team.create({
    data: {
      eventId,
      name: teamName,
      members: { create: { userId } },
    },
    include: teamInclude,
  });
  return toTeam(team);
}

export async function joinTeam(teamId: string, userId: string): Promise<ApiTeam> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { event: true, ...teamInclude },
  });
  if (!team) {
    throw new ParticipationError("NOT_FOUND", "Team not found");
  }

  assertOpenForParticipation(team.event.status);

  const alreadyOnThisTeam = team.members.some((member) => member.userId === userId);
  if (alreadyOnThisTeam) {
    return toTeam(team);
  }

  const existingMembership = await prisma.teamMember.findFirst({
    where: { userId, team: { eventId: team.eventId } },
  });
  if (existingMembership) {
    throw new ParticipationError("CONFLICT", "You already belong to a team for this event.");
  }

  await prisma.teamMember.create({
    data: { teamId: team.id, userId },
  });

  const updated = await prisma.team.findUniqueOrThrow({
    where: { id: team.id },
    include: teamInclude,
  });
  return toTeam(updated);
}

export async function createOrUpdateSubmission(
  teamId: string,
  userId: string,
  data: { title: string; repo_url?: string | null; demo_url?: string | null },
): Promise<ApiSubmission> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { event: true, members: true },
  });
  if (!team) {
    throw new ParticipationError("NOT_FOUND", "Team not found");
  }
  if (!team.members.some((member) => member.userId === userId)) {
    throw new ParticipationError("FORBIDDEN", "Only team members can submit a project.");
  }

  assertOpenForSubmission(team.event.status);

  const existing = await prisma.submission.findFirst({
    where: { teamId: team.id, eventId: team.eventId },
  });

  const payload = {
    title: data.title,
    repoUrl: data.repo_url ?? null,
    demoUrl: data.demo_url ?? null,
  };

  const submission = existing
    ? await prisma.submission.update({
        where: { id: existing.id },
        data: payload,
        include: { team: { select: { name: true } } },
      })
    : await prisma.submission.create({
        data: {
          eventId: team.eventId,
          teamId: team.id,
          ...payload,
        },
        include: { team: { select: { name: true } } },
      });

  return toSubmission(submission);
}

export async function updateSubmission(
  submissionId: string,
  userId: string,
  data: { title?: string; repo_url?: string | null; demo_url?: string | null },
): Promise<ApiSubmission> {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { event: true, team: { include: { members: true } } },
  });
  if (!submission) {
    throw new ParticipationError("NOT_FOUND", "Submission not found");
  }
  if (!submission.team.members.some((member) => member.userId === userId)) {
    throw new ParticipationError("FORBIDDEN", "Only team members can update this submission.");
  }

  assertOpenForSubmission(submission.event.status);

  const updated = await prisma.submission.update({
    where: { id: submission.id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.repo_url !== undefined ? { repoUrl: data.repo_url } : {}),
      ...(data.demo_url !== undefined ? { demoUrl: data.demo_url } : {}),
    },
    include: { team: { select: { name: true } } },
  });
  return toSubmission(updated);
}

export async function listEventSubmissions(eventId: string): Promise<ApiSubmission[]> {
  await getEventOrThrow(eventId);
  const submissions = await prisma.submission.findMany({
    where: { eventId },
    orderBy: { createdAt: "asc" },
    include: { team: { select: { name: true } } },
  });
  return submissions.map(toSubmission);
}

export async function listMyParticipations(userId: string): Promise<DeveloperParticipation[]> {
  const memberships = await prisma.teamMember.findMany({
    where: { userId },
    orderBy: { id: "desc" },
    include: {
      team: {
        include: {
          event: { select: { id: true, slug: true, title: true, status: true } },
          ...teamInclude,
          submissions: true,
        },
      },
    },
  });

  return memberships.map((membership) => {
    const team = membership.team;
    const submission = team.submissions.find((item) => item.eventId === team.eventId) ?? null;
    return {
      event: team.event,
      registrationId: membership.id,
      team: toTeam(team),
      submission: submission
        ? toSubmission({ ...submission, team: { name: team.name } })
        : null,
    };
  });
}
