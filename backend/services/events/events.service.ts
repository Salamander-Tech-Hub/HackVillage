import { prisma } from "@backend/lib/db";
import {
  eventDraftSchema,
  updateEventDraftSchema,
} from "@backend/lib/validations/event.schema";
import { EventStatus, type Event } from "@prisma/client";
import type { z } from "zod";

export type ApiEvent = {
  id: string;
  slug: string;
  title: string;
  problem_statement: string;
  prize_total: number;
  start: string | null;
  end: string | null;
  status: EventStatus;
  organizerId: string;
  createdAt: string;
  updatedAt: string;
};

export function toApiEvent(event: Event): ApiEvent {
  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    problem_statement: event.problemStatement,
    prize_total: Number(event.prizePoolKes),
    start: event.startsAt?.toISOString() ?? null,
    end: event.endsAt?.toISOString() ?? null,
    status: event.status,
    organizerId: event.organizerId,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || "event"}-${Date.now()}`;
}

export async function createDraftEvent(
  organizerId: string,
  data: z.infer<typeof eventDraftSchema>,
): Promise<ApiEvent> {
  const event = await prisma.event.create({
    data: {
      title: data.title,
      problemStatement: data.problem_statement,
      prizePoolKes: data.prize_total,
      startsAt: data.start ? new Date(data.start) : null,
      endsAt: data.end ? new Date(data.end) : null,
      status: EventStatus.DRAFT,
      organizerId,
      slug: slugify(data.title),
    },
  });
  return toApiEvent(event);
}

export async function getOrganizerEvents(organizerId: string): Promise<ApiEvent[]> {
  const events = await prisma.event.findMany({
    where: { organizerId },
    orderBy: { createdAt: "desc" },
  });
  return events.map(toApiEvent);
}

export async function getEventDetail(id: string): Promise<ApiEvent | null> {
  const event = await prisma.event.findUnique({ where: { id } });
  return event ? toApiEvent(event) : null;
}

export async function updateEventDraft(
  id: string,
  organizerId: string,
  data: z.infer<typeof updateEventDraftSchema>,
): Promise<ApiEvent> {
  const event = await prisma.event.findUnique({ where: { id } });

  if (!event) {
    throw new Error("NOT_FOUND");
  }
  if (event.organizerId !== organizerId) {
    throw new Error("FORBIDDEN");
  }
  if (event.status !== EventStatus.DRAFT) {
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
    },
  });

  return toApiEvent(updated);
}
