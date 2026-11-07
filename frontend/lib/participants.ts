import type { OrganizerSubmission, OrganizerTeam, ParticipantProject } from "@/lib/types";

export function canPickWinners(status: string): boolean {
  return status === "JUDGING" || status === "CLOSED";
}

export function winnerIdsFromSubmissions(submissions: OrganizerSubmission[]): string[] {
  return submissions.filter((submission) => submission.isWinner).map((submission) => submission.id);
}

export function sameWinnerSet(current: string[], next: string[]): boolean {
  if (current.length !== next.length) return false;
  const expected = new Set(current);
  return next.every((id) => expected.has(id));
}

export function buildParticipantProjects(
  teams: OrganizerTeam[],
  submissions: OrganizerSubmission[],
): ParticipantProject[] {
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const seenTeamIds = new Set<string>();
  const rows: ParticipantProject[] = [];

  for (const submission of submissions) {
    const team = teamById.get(submission.teamId);
    seenTeamIds.add(submission.teamId);
    rows.push({
      teamId: submission.teamId,
      teamName: submission.teamName || team?.name || "Untitled team",
      members: team?.members ?? [],
      submissionId: submission.id,
      title: submission.title,
      repoUrl: submission.repoUrl,
      demoUrl: submission.demoUrl,
      isWinner: submission.isWinner,
    });
  }

  for (const team of teams) {
    if (seenTeamIds.has(team.id)) continue;
    rows.push({
      teamId: team.id,
      teamName: team.name,
      members: team.members,
      submissionId: null,
      title: null,
      repoUrl: null,
      demoUrl: null,
      isWinner: false,
    });
  }

  return rows;
}

export function filterParticipantProjects(
  projects: ParticipantProject[],
  query: string,
): ParticipantProject[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return projects;

  return projects.filter((project) => {
    const haystack = [
      project.title,
      project.teamName,
      project.repoUrl,
      project.demoUrl,
      ...project.members.map((member) => member.name),
      ...project.members.map((member) => member.email),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}
