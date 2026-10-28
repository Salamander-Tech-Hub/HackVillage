import type { AppRole } from "@backend/lib/session";

/**
 * Who can read an event's judges and teams lists (#84).
 * These are plain functions so the rules can be tested without a database.
 */

export type EventAccessViewer = {
  userId: string;
  role: AppRole;
};

export type EventAccessFacts = {
  event: { organizerId: string; status: string };
  /** Null when nobody is signed in. */
  viewer: EventAccessViewer | null;
  /** Has a judge assignment for this event. */
  isAssignedJudge: boolean;
  /** Is on a team registered for this event. */
  isRegisteredParticipant: boolean;
};

export type EventAccessDecision =
  | { allowed: true }
  | { allowed: false; reason: "UNAUTHORIZED" | "FORBIDDEN" };

/** Once an event has gone live, anyone can see its teams, signed in or not. */
export const TEAM_LIST_PUBLIC_STATUSES: readonly string[] = [
  "LIVE",
  "JUDGING",
  "CLOSED",
  "ARCHIVED",
];

const allow: EventAccessDecision = { allowed: true };
const unauthorized: EventAccessDecision = { allowed: false, reason: "UNAUTHORIZED" };
const forbidden: EventAccessDecision = { allowed: false, reason: "FORBIDDEN" };

function isOwnerOrAdmin(facts: EventAccessFacts & { viewer: EventAccessViewer }): boolean {
  return facts.viewer.role === "ADMIN" || facts.event.organizerId === facts.viewer.userId;
}

/** Judges list: the owner, an admin, or a judge assigned to the event. */
export function canListJudges(facts: EventAccessFacts): EventAccessDecision {
  if (!facts.viewer) return unauthorized;
  const viewerFacts = { ...facts, viewer: facts.viewer };
  if (isOwnerOrAdmin(viewerFacts)) return allow;
  if (facts.isAssignedJudge) return allow;
  return forbidden;
}

/**
 * Teams list; the owner, an admin, an assigned judge or a registered participant 
 * Anyone once the event is live.
 */
export function canListTeams(facts: EventAccessFacts): EventAccessDecision {
  if (TEAM_LIST_PUBLIC_STATUSES.includes(facts.event.status)) return allow;
  if (!facts.viewer) return unauthorized;
  const viewerFacts = { ...facts, viewer: facts.viewer };
  if (isOwnerOrAdmin(viewerFacts)) return allow;
  if (facts.isAssignedJudge || facts.isRegisteredParticipant) return allow;
  return forbidden;
}
