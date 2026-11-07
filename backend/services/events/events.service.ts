import { prisma } from "@backend/lib/db";
import {
  eventDraftSchema,
  updateEventDraftSchema,
} from "@backend/lib/validations/event.schema";
import { isPaystackConfigured } from "@backend/lib/paystack";
import {
  visibleOrganizerActions,
  type LifecycleAction,
  type LifecycleStatus,
} from "@backend/services/events/lifecycle";
import type { EscrowState, EventFormat, EventStatus } from "@prisma/client";
import type { z } from "zod";

export const ORGANIZER_EVENT_INCLUDE = {
  escrowVault: true,
  _count: { select: { submissions: true, registrations: true } },
} as const;

export type OrganizerEventEscrow = {
  state: EscrowState;
  amountKes: number;
  publicLedgerUrl: string | null;
};

export type OrganizerApiEvent = {
  id: string;
  slug: string;
  title: string;
  problemStatement: string;
  problem_statement: string;
  status: EventStatus;
  prizePoolKes: number;
  prize_total: number;
  startsAt: string | null;
  start: string | null;
  endsAt: string | null;
  end: string | null;
  location: string | null;
  format: EventFormat | null;
  registrationsCount: number;
  submissionsCount: number;
  organizerId: string;
  createdAt: string;
  updatedAt: string;
  escrow: OrganizerEventEscrow | null;
  allowedActions: LifecycleAction[];
  paystackConfigured: boolean;
};

export type OrganizerEventRecord = {
  id: string;
  slug: string;
  title: string;
  problemStatement: string;
  status: EventStatus;
  prizePoolKes: { toString(): string } | number;
  startsAt: Date | null;
  endsAt: Date | null;
  location: string | null;
  format: EventFormat | null;
  organizerId: string;
  createdAt: Date;
  updatedAt: Date;
  escrowVault: {
    state: EscrowState;
    amountKes: { toString(): string } | number;
    publicLedgerUrl: string | null;
  } | null;
  _count: { submissions: number; registrations: number };
};

export function toApiEvent(event: OrganizerEventRecord): OrganizerApiEvent {
  const prizePoolKes = Number(event.prizePoolKes);
  const startsAt = event.startsAt?.toISOString() ?? null;
  const endsAt = event.endsAt?.toISOString() ?? null;
  const registrationsCount = event._count.registrations;
  const paystackConfigured = isPaystackConfigured();

  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    problemStatement: event.problemStatement,
    problem_statement: event.problemStatement,
    status: event.status,
    prizePoolKes,
    prize_total: prizePoolKes,
    startsAt,
    start: startsAt,
    endsAt,
    end: endsAt,
    location: event.location,
    format: event.format,
    registrationsCount,
    submissionsCount: event._count.submissions,
    organizerId: event.organizerId,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
    escrow: event.escrowVault
      ? {
          state: event.escrowVault.state,
          amountKes: Number(event.escrowVault.amountKes),
          publicLedgerUrl: event.escrowVault.publicLedgerUrl,
        }
      : null,
    allowedActions: visibleOrganizerActions(event.status as LifecycleStatus, paystackConfigured),
    paystackConfigured,
  };
}

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || "event"}-${Date.now()}`;
}

function emptyLocation(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function createDraftEvent(
  organizerId: string,
  data: z.infer<typeof eventDraftSchema>,
): Promise<OrganizerApiEvent> {
  const event = await prisma.event.create({
    data: {
      title: data.title,
      problemStatement: data.problem_statement,
      prizePoolKes: data.prize_total,
      startsAt: data.start ? new Date(data.start) : null,
      endsAt: data.end ? new Date(data.end) : null,
      location: emptyLocation(data.location),
      format: data.format ?? null,
      status: "DRAFT",
      organizerId,
      slug: slugify(data.title),
    },
    include: ORGANIZER_EVENT_INCLUDE,
  });
  return toApiEvent(event);
}

export async function getOrganizerEvents(organizerId: string): Promise<OrganizerApiEvent[]> {
  const events = await prisma.event.findMany({
    where: { organizerId },
    orderBy: { createdAt: "desc" },
    include: ORGANIZER_EVENT_INCLUDE,
  });
  return events.map(toApiEvent);
}

export async function getEventDetail(id: string): Promise<OrganizerApiEvent | null> {
  const event = await prisma.event.findUnique({
    where: { id },
    include: ORGANIZER_EVENT_INCLUDE,
  });
  return event ? toApiEvent(event) : null;
}

export async function updateEventDraft(
  id: string,
  organizerId: string,
  data: z.infer<typeof updateEventDraftSchema>,
): Promise<OrganizerApiEvent> {
  const event = await prisma.event.findUnique({ where: { id } });

  if (!event) {
    throw new Error("NOT_FOUND");
  }
  if (event.organizerId !== organizerId) {
    throw new Error("FORBIDDEN");
  }
  if (event.status !== "DRAFT") {
    throw new Error("NOT_DRAFT");
  }

  const updated = await prisma.event.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.problem_statement !== undefined
        ? { problemStatement: data.problem_statement }
        : {}),
      ...(data.prize_total !== undefined ? { prizePoolKes: data.prize_total } : {}),
      ...(data.start !== undefined
        ? { startsAt: data.start ? new Date(data.start) : null }
        : {}),
      ...(data.end !== undefined ? { endsAt: data.end ? new Date(data.end) : null } : {}),
      ...(data.location !== undefined ? { location: emptyLocation(data.location) } : {}),
      ...(data.format !== undefined ? { format: data.format } : {}),
    },
    include: ORGANIZER_EVENT_INCLUDE,
  });

  return toApiEvent(updated);
}
