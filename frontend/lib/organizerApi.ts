import { MOCK_ORGANIZER_EVENTS } from "@/lib/mockEvents";
import { summarizeOverview } from "@/lib/organizerData";
import type {
  ApiErrorResponse,
  ApiValidationErrorResponse,
  DraftEventInput,
  DraftEventPatchInput,
  EscrowState,
  EventStatus,
  EventsListResponse,
  FieldErrorMap,
  OrganizerEvent,
  OrganizerOverview,
  PaginatedEventsResponse,
} from "@/lib/types";

const ENABLE_MOCK_EVENTS =
  process.env.NEXT_PUBLIC_ENABLE_MOCK_EVENTS === "true";

export class OrganizerApiError extends Error {
  status: number;
  code?: string;
  fieldErrors?: FieldErrorMap;

  constructor(
    message: string,
    status: number,
    code?: string,
    fieldErrors?: FieldErrorMap,
  ) {
    super(message);
    this.name = "OrganizerApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
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

export async function createEvent(payload: DraftEventInput): Promise<OrganizerEvent> {
  const response = await fetch("/api/events", {
    method: "POST",
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await toApiError(response);
  }

  const result = (await response.json()) as unknown;
  return normalizeEventPayload(result);
}

export async function updateEvent(
  eventId: string,
  payload: DraftEventPatchInput,
): Promise<OrganizerEvent> {
  const response = await fetch(`/api/events/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await toApiError(response);
  }

  const result = (await response.json()) as unknown;
  return normalizeEventPayload(result);
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
    problemStatement: toNullableString(record.problemStatement),
    status: String(record.status ?? "DRAFT") as EventStatus,
    prizePoolKes: toNumber(record.prizePoolKes),
    startsAt: toNullableString(record.startsAt),
    endsAt: toNullableString(record.endsAt),
    location: toNullableString(record.location),
    format: toFormat(record.format),
    registrationsCount: toNullableNumber(record.registrationsCount),
    submissionsCount: toNumber(record.submissionsCount),
    updatedAt: toNullableString(record.updatedAt),
    escrow,
  };
}

async function toApiError(response: Response): Promise<OrganizerApiError> {
  let message = `Request failed with status ${response.status}`;
  let code: string | undefined;
  let fieldErrors: FieldErrorMap | undefined;
  try {
    const body = (await response.json()) as ApiErrorResponse | ApiValidationErrorResponse;
    if ("error" in body && body.error) message = body.error;
    if ("message" in body && body.message) message = body.message;
    if (body?.code) code = body.code;
    if ("errors" in body && body.errors && typeof body.errors === "object") {
      fieldErrors = body.errors as FieldErrorMap;
    }
  } catch {
    // Ignore parse failures and use default message.
  }
  return new OrganizerApiError(message, response.status, code, fieldErrors);
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
