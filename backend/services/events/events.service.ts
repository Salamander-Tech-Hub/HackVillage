import { prisma } from "../../lib/db";
import { EventStatus } from "@prisma/client";
import { z } from "zod";
import { eventDraftSchema, updateEventDraftSchema } from "../../lib/validations/event.schema";

export async function createDraftEvent(organizerId: string, data: z.infer<typeof eventDraftSchema>) {
  return prisma.event.create({
    data: {
      title: data.title,
      problem_statement: data.problem_statement,
      prize_total: data.prize_total,
      prizePoolKes: 0, // Default for compatibility
      start: data.start ? new Date(data.start) : null,
      end: data.end ? new Date(data.end) : null,
      status: EventStatus.DRAFT,
      organizerId,
      slug: data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now(),
    },
  });
}

export async function getOrganizerEvents(organizerId: string) {
  return prisma.event.findMany({
    where: { organizerId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getEventDetail(id: string) {
  return prisma.event.findUnique({
    where: { id },
  });
}

export async function updateEventDraft(id: string, organizerId: string, data: z.infer<typeof updateEventDraftSchema>) {
  const event = await prisma.event.findUnique({
    where: { id },
  });

  if (!event) {
    throw new Error("NOT_FOUND");
  }

  if (event.organizerId !== organizerId) {
    throw new Error("UNAUTHORIZED");
  }

  if (event.status !== EventStatus.DRAFT) {
    throw new Error("NOT_DRAFT");
  }

  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.problem_statement !== undefined) updateData.problem_statement = data.problem_statement;
  if (data.prize_total !== undefined) updateData.prize_total = data.prize_total;
  if (data.start !== undefined) updateData.start = data.start ? new Date(data.start) : null;
  if (data.end !== undefined) updateData.end = data.end ? new Date(data.end) : null;

  return prisma.event.update({
    where: { id },
    data: updateData,
  });
}
