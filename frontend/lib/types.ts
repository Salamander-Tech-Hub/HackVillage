/**
 * Shared event types used by organizer pages and API route handlers.
 */

export type KnownEventStatus =
  | "DRAFT"
  | "PENDING_ESCROW"
  | "PRIZE_VERIFIED"
  | "LIVE"
  | "JUDGING"
  | "CLOSED"
  | "ARCHIVED";

// Keep open for forwards compatibility if backend introduces new statuses.
export type EventStatus = KnownEventStatus | (string & {});

export type LifecycleAction =
  | "START_ESCROW"
  | "VERIFY_ESCROW"
  | "PUBLISH"
  | "START_JUDGING"
  | "CLOSE"
  | "ARCHIVE";

export type FieldErrorMap = Record<string, string>;

export type EventFormInput = {
  title: string;
  problemStatement: string;
  prizePoolKes: number;
  startsAt: string | null;
  endsAt: string | null;
  location: string | null;
  format: "IN_PERSON" | "VIRTUAL" | "HYBRID" | null;
};

export type EscrowState =
  | "PENDING_DEPOSIT"
  | "PRIZE_VAULT"
  | "PARTIAL_RELEASED"
  | "FULLY_RELEASED"
  | "LOCKED_ERROR";

export interface OrganizerEventEscrow {
  state: EscrowState;
  amountKes: number;
  publicLedgerUrl: string | null;
}

export interface OrganizerEvent {
  id: string;
  slug: string | null;
  title: string;
  problemStatement: string | null;
  status: EventStatus;
  prizePoolKes: number;
  startsAt: string | null;
  endsAt: string | null;
  location: string | null;
  format: "IN_PERSON" | "VIRTUAL" | "HYBRID" | null;
  registrationsCount: number | null;
  submissionsCount: number;
  updatedAt: string | null;
  escrow: OrganizerEventEscrow | null;
  allowedActions?: LifecycleAction[];
  paystackConfigured?: boolean;
}

export interface EventsListResponse {
  events: OrganizerEvent[];
  source: "database" | "mock" | "unknown";
  count: number;
}

export interface OrganizerOverview {
  totalEvents: number;
  draftEvents: number;
  liveEvents: number;
  prizeVerifiedEvents: number;
  completedEvents: number;
  totalRegistrations: number;
}

export interface ApiErrorResponse {
  error: string | { code?: string; message?: string };
  code?: string;
}

export interface PaginatedEventsResponse {
  items: OrganizerEvent[];
  total: number;
  page?: number;
  pageSize?: number;
}

export interface OrganizerTeamMember {
  userId: string;
  name: string | null;
  email: string;
}

export interface OrganizerTeam {
  id: string;
  eventId: string;
  name: string;
  createdAt?: string;
  members: OrganizerTeamMember[];
}

export interface OrganizerSubmission {
  id: string;
  eventId: string;
  teamId: string;
  teamName: string;
  title: string;
  repoUrl: string | null;
  demoUrl: string | null;
  status: string;
  isWinner: boolean;
}

export interface DeclaredWinner {
  id: string;
  title: string;
  teamId: string;
}

export interface ParticipantProject {
  teamId: string;
  teamName: string;
  members: OrganizerTeamMember[];
  submissionId: string | null;
  title: string | null;
  repoUrl: string | null;
  demoUrl: string | null;
  isWinner: boolean;
}
