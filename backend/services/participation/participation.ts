export const PARTICIPATION_STATUSES = ["PRIZE_VERIFIED", "LIVE"] as const;
export const SUBMISSION_STATUSES = ["PRIZE_VERIFIED", "LIVE"] as const;

export type ParticipationStatus = (typeof PARTICIPATION_STATUSES)[number];

export class ParticipationError extends Error {
  code: "NOT_FOUND" | "FORBIDDEN" | "PRECONDITION_FAILED" | "CONFLICT";

  constructor(code: ParticipationError["code"], message: string) {
    super(message);
    this.name = "ParticipationError";
    this.code = code;
  }
}

export function assertOpenForParticipation(status: string): asserts status is ParticipationStatus {
  if (!PARTICIPATION_STATUSES.includes(status as ParticipationStatus)) {
    throw new ParticipationError(
      "PRECONDITION_FAILED",
      "Registration and teams are only open for prize-verified or live events.",
    );
  }
}

export function assertOpenForSubmission(status: string): void {
  if (!SUBMISSION_STATUSES.includes(status as ParticipationStatus)) {
    throw new ParticipationError(
      "PRECONDITION_FAILED",
      "Submissions are only accepted while the event is prize-verified or live.",
    );
  }
}

export function normalizeTeamName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}
