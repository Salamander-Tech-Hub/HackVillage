import { MOCK_ORGANIZER_EVENTS } from "@/lib/mockEvents";
import { summarizeOverview } from "@/lib/organizerData";
import type {
  ApiErrorResponse,
  DeclaredWinner,
  EscrowState,
  EventFormInput,
  EventStatus,
  EventsListResponse,
  LifecycleAction,
  OrganizerEvent,
  OrganizerOverview,
  OrganizerSubmission,
  OrganizerTeam,
  PaginatedEventsResponse,
} from "@/lib/types";

const ENABLE_MOCK_EVENTS =
  process.env.NEXT_PUBLIC_ENABLE_MOCK_EVENTS === "true";

export class OrganizerApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "OrganizerApiError";
    this.status = status;
    this.code = code;
  }
}

function toDraftPayload(input: EventFormInput) {
  return {
    title: input.title,
    problem_statement: input.problemStatement,
    prize_total: input.prizePoolKes,
    start: input.startsAt ?? undefined,
    end: input.endsAt ?? undefined,
    location: input.location,
    format: input.format,
  };
}

export async function createEvent(input: EventFormInput): Promise<OrganizerEvent> {
  const response = await fetch("/api/events", {
    method: "POST",
    cache: "no-store",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toDraftPayload(input)),
  });

  if (!response.ok) {
    throw await toApiError(response);
  }

  return normalizeEventPayload(await response.json());
}

export async function updateEvent(
  eventId: string,
  input: EventFormInput,
): Promise<OrganizerEvent> {
  const response = await fetch(`/api/events/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    cache: "no-store",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toDraftPayload(input)),
  });

  if (!response.ok) {
    throw await toApiError(response);
  }

  return normalizeEventPayload(await response.json());
}

export async function transitionEvent(
  eventId: string,
  action: LifecycleAction,
): Promise<OrganizerEvent> {
  const response = await fetch(
    `/api/events/${encodeURIComponent(eventId)}/transitions`,
    {
      method: "POST",
      cache: "no-store",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    },
  );

  if (!response.ok) {
    throw await toApiError(response);
  }

  return normalizeEventPayload(await response.json());
}

export type OrganizerJudgingProgress = {
  eventId: string;
  status: string;
  totalSubmissions: number;
  totalJudges: number;
  totalReviewsRequired: number;
  totalReviewsCompleted: number;
  percentage: number;
  isReadyToClose: boolean;
  missingReason: string | null;
  judges: {
    judgeId: string;
    name: string;
    email: string;
    reviewed: number;
    total: number;
    pending: number;
    isComplete: boolean;
  }[];
  submissions: {
    submissionId: string;
    title: string;
    teamName: string;
    reviewed: number;
    total: number;
    isComplete: boolean;
  }[];
};

export async function getJudgingProgress(eventId: string): Promise<OrganizerJudgingProgress> {
  const response = await fetch(
    `/api/events/${encodeURIComponent(eventId)}/judging/progress`,
    {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
    },
  );
  if (!response.ok) {
    throw await toApiError(response);
  }
  return (await response.json()) as OrganizerJudgingProgress;
}

export async function getMyEvents(): Promise<EventsListResponse> {
  try {
    const response = await fetch("/api/events?mine=1", {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
    });

    if (!response.ok) {
      throw await toApiError(response);
    }

    const json = (await response.json()) as unknown;
    const events = normalizeEventsPayload(json);

    return {
      events,
      source: detectSource(json),
      count: events.length,
    };
  } catch (error) {
    if (!shouldFallbackToMock(error)) {
      throw error;
    }

    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(
        "[organizerApi] Falling back to mock organizer events because API is unavailable.",
      );
    }

    return {
      events: MOCK_ORGANIZER_EVENTS,
      source: "mock",
      count: MOCK_ORGANIZER_EVENTS.length,
    };
  }
}

export async function getOrganizerOverview(): Promise<OrganizerOverview> {
  const { events } = await getMyEvents();
  return summarizeOverview(events);
}

export async function getOrganizerEventById(
  eventId: string,
): Promise<OrganizerEvent> {
  const response = await fetch(`/api/events/${encodeURIComponent(eventId)}?mine=1`, {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw await toApiError(response);
  }

  const payload = (await response.json()) as unknown;
  return normalizeEventPayload(payload);
}

export type OrganizerTransition = {
  id: string;
  action: string;
  fromStatus: string;
  toStatus: string;
  createdAt: string;
  actorName: string;
};

export type OrganizerLedgerEntry = {
  id: string;
  kind: string;
  amountKes: number;
  txHash: string;
  publicUrl: string | null;
  createdAt: string;
};

export type OrganizerPayout = {
  id: string;
  phase: string;
  status: string;
  amountKes: number;
  submissionTitle: string | null;
  createdAt: string;
};

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
  });
  if (!response.ok) {
    throw await toApiError(response);
  }
  return (await response.json()) as T;
}

export function getEventTransitions(eventId: string) {
  return getJson<{ transitions: OrganizerTransition[] }>(
    `/api/events/${encodeURIComponent(eventId)}/transitions`,
  ).then((payload) => payload.transitions);
}

export function getEventLedger(eventId: string) {
  return getJson<{ entries: OrganizerLedgerEntry[]; publicLedgerUrl: string | null }>(
    `/api/events/${encodeURIComponent(eventId)}/ledger`,
  );
}

export function getEventPayouts(eventId: string) {
  return getJson<{ payouts: OrganizerPayout[] }>(
    `/api/events/${encodeURIComponent(eventId)}/payouts`,
  ).then((payload) => payload.payouts);
}

export async function getEventTeams(eventId: string): Promise<OrganizerTeam[]> {
  const response = await fetch(`/api/events/${encodeURIComponent(eventId)}/teams`, {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
  });
  if (!response.ok) {
    throw await toApiError(response);
  }
  const payload = (await response.json()) as unknown;
  if (!isRecord(payload) || !Array.isArray(payload.teams)) {
    throw new OrganizerApiError("Invalid teams response payload", 500, "BAD_PAYLOAD");
  }
  return payload.teams.map(normalizeTeam);
}

export async function getEventSubmissions(eventId: string): Promise<OrganizerSubmission[]> {
  const response = await fetch(`/api/events/${encodeURIComponent(eventId)}/submissions`, {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
  });
  if (!response.ok) {
    throw await toApiError(response);
  }
  const payload = (await response.json()) as unknown;
  if (!isRecord(payload) || !Array.isArray(payload.submissions)) {
    throw new OrganizerApiError("Invalid submissions response payload", 500, "BAD_PAYLOAD");
  }
  return payload.submissions.map(normalizeSubmission);
}

export async function declareWinners(
  eventId: string,
  submissionIds: string[],
): Promise<DeclaredWinner[]> {
  const response = await fetch(`/api/events/${encodeURIComponent(eventId)}/winners`, {
    method: "POST",
    cache: "no-store",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ submissionIds }),
  });
  if (!response.ok) {
    throw await toApiError(response);
  }
  const payload = (await response.json()) as unknown;
  if (!isRecord(payload) || !Array.isArray(payload.winners)) {
    throw new OrganizerApiError("Invalid winners response payload", 500, "BAD_PAYLOAD");
  }
  return payload.winners.map((winner) => {
    const record = asRecord(winner);
    return {
      id: String(record.id ?? ""),
      title: String(record.title ?? "Untitled project"),
      teamId: String(record.teamId ?? ""),
    };
  });
}

function normalizeEventsPayload(payload: unknown): OrganizerEvent[] {
  if (Array.isArray(payload)) {
    return payload.map(normalizeEvent);
  }

  if (isRecord(payload) && Array.isArray(payload.events)) {
    return payload.events.map(normalizeEvent);
  }

  if (isPaginated(payload)) {
    return payload.items.map(normalizeEvent);
  }

  throw new OrganizerApiError("Invalid events response payload", 500, "BAD_PAYLOAD");
}

function normalizeEventPayload(payload: unknown): OrganizerEvent {
  if (isRecord(payload) && isRecord(payload.event)) {
    return normalizeEvent(payload.event);
  }
  if (isRecord(payload)) {
    return normalizeEvent(payload);
  }
  throw new OrganizerApiError("Invalid event response payload", 500, "BAD_PAYLOAD");
}

function normalizeEvent(input: unknown): OrganizerEvent {
  const record = asRecord(input);
  const escrow = isRecord(record.escrow)
    ? {
        state: toEscrowState(record.escrow.state),
        amountKes: toNumber(record.escrow.amountKes),
        publicLedgerUrl: toNullableString(record.escrow.publicLedgerUrl),
      }
    : null;

  return {
    id: String(record.id ?? ""),
    slug: toNullableString(record.slug),
    title: String(record.title ?? "Untitled event"),
    problemStatement: toNullableString(
      record.problemStatement ?? record.problem_statement,
    ),
    status: String(record.status ?? "DRAFT") as EventStatus,
    prizePoolKes: toNumber(record.prizePoolKes ?? record.prize_total),
    startsAt: toNullableString(record.startsAt ?? record.start),
    endsAt: toNullableString(record.endsAt ?? record.end),
    location: toNullableString(record.location),
    format: toFormat(record.format),
    registrationsCount: toNullableNumber(record.registrationsCount),
    submissionsCount: toNumber(record.submissionsCount),
    updatedAt: toNullableString(record.updatedAt),
    escrow,
    allowedActions: Array.isArray(record.allowedActions)
      ? record.allowedActions.filter(isLifecycleAction)
      : undefined,
    paystackConfigured: record.paystackConfigured === true,
  };
}

function isLifecycleAction(value: unknown): value is LifecycleAction {
  return (
    value === "START_ESCROW" ||
    value === "VERIFY_ESCROW" ||
    value === "PUBLISH" ||
    value === "START_JUDGING" ||
    value === "CLOSE" ||
    value === "ARCHIVE"
  );
}

async function toApiError(response: Response): Promise<OrganizerApiError> {
  let message = `Request failed with status ${response.status}`;
  let code: string | undefined;
  try {
    const body = (await response.json()) as ApiErrorResponse;
    if (typeof body?.error === "string") {
      message = body.error;
      code = body.code;
    } else if (body?.error && typeof body.error === "object") {
      message = body.error.message || message;
      code = body.error.code || body.code;
    }
  } catch {
    // Ignore parse failures and use default message.
  }
  return new OrganizerApiError(message, response.status, code);
}

function shouldFallbackToMock(error: unknown): boolean {
  if (!ENABLE_MOCK_EVENTS || process.env.NODE_ENV === "production") {
    return false;
  }

  if (error instanceof OrganizerApiError) {
    if (error.status === 401 || error.status === 403) {
      return false;
    }
    return error.status >= 500;
  }

  return true;
}

function detectSource(payload: unknown): EventsListResponse["source"] {
  if (isRecord(payload) && payload.source === "database") return "database";
  if (isRecord(payload) && payload.source === "mock") return "mock";
  return "unknown";
}

function isPaginated(payload: unknown): payload is PaginatedEventsResponse {
  return isRecord(payload) && Array.isArray(payload.items);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new OrganizerApiError("Invalid event object", 500, "BAD_EVENT");
  }
  return value;
}

function toNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return String(value);
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function toFormat(value: unknown): OrganizerEvent["format"] {
  if (value === "IN_PERSON" || value === "VIRTUAL" || value === "HYBRID") {
    return value;
  }
  return null;
}

function normalizeTeam(input: unknown): OrganizerTeam {
  const record = asRecord(input);
  const members = Array.isArray(record.members)
    ? record.members.map((member) => {
        const row = asRecord(member);
        return {
          userId: String(row.userId ?? ""),
          name: toNullableString(row.name),
          email: String(row.email ?? ""),
        };
      })
    : [];

  return {
    id: String(record.id ?? ""),
    eventId: String(record.eventId ?? ""),
    name: String(record.name ?? "Untitled team"),
    createdAt: toNullableString(record.createdAt) ?? undefined,
    members,
  };
}

function normalizeSubmission(input: unknown): OrganizerSubmission {
  const record = asRecord(input);
  return {
    id: String(record.id ?? ""),
    eventId: String(record.eventId ?? ""),
    teamId: String(record.teamId ?? ""),
    teamName: String(record.teamName ?? "Untitled team"),
    title: String(record.title ?? "Untitled project"),
    repoUrl: toNullableString(record.repoUrl ?? record.repo_url),
    demoUrl: toNullableString(record.demoUrl ?? record.demo_url),
    status: String(record.status ?? "DEMO"),
    isWinner: record.isWinner === true,
  };
}

function toEscrowState(value: unknown): EscrowState {
  if (
    value === "PENDING_DEPOSIT" ||
    value === "PRIZE_VAULT" ||
    value === "PARTIAL_RELEASED" ||
    value === "FULLY_RELEASED" ||
    value === "LOCKED_ERROR"
  ) {
    return value;
  }
  return "LOCKED_ERROR";
}
