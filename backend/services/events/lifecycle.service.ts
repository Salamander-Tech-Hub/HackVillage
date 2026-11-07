import { prisma } from "@backend/lib/db";
import { lockPrizePool } from "@backend/services/escrow";
import {
  ORGANIZER_EVENT_INCLUDE,
  toApiEvent,
  type OrganizerApiEvent,
} from "@backend/services/events/events.service";
import {
  assertPreconditions,
  assertTestVerifyAllowed,
  assertTransition,
  LifecycleError,
  type LifecycleAction,
  type LifecycleStatus,
} from "@backend/services/events/lifecycle";
import { isPaystackConfigured } from "@backend/lib/paystack";
import { getJudgingReadinessForEvent } from "@backend/services/judging/judging.service";
import type { AppRole } from "@backend/lib/session";

export async function transitionEvent(input: {
  eventId: string;
  actorId: string;
  actorRole: AppRole;
  action: LifecycleAction;
}): Promise<OrganizerApiEvent> {
  const event = await prisma.event.findUnique({
    where: { id: input.eventId },
    include: { escrowVault: true },
  });

  if (!event) {
    throw new LifecycleError("NOT_FOUND", "Event not found");
  }

  if (event.organizerId !== input.actorId && input.actorRole !== "ADMIN") {
    throw new LifecycleError("FORBIDDEN", "You do not own this event");
  }

  const fromStatus = event.status as LifecycleStatus;
  const toStatus = assertTransition(fromStatus, input.action);
  assertPreconditions(input.action, {
    status: fromStatus,
    title: event.title,
    problemStatement: event.problemStatement,
    prizePoolKes: Number(event.prizePoolKes),
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    escrowState: event.escrowVault?.state ?? null,
  });

  if (input.action === "CLOSE") {
    const readiness = await getJudgingReadinessForEvent(event.id);
    if (!readiness.complete) {
      throw new LifecycleError("PRECONDITION_FAILED", readiness.reason);
    }
  }

  if (input.action === "VERIFY_ESCROW") {
    assertTestVerifyAllowed(isPaystackConfigured());
  }

  await prisma.$transaction(async (tx) => {
    if (input.action === "START_ESCROW") {
      await tx.escrowVault.upsert({
        where: { eventId: event.id },
        create: {
          eventId: event.id,
          state: "PENDING_DEPOSIT",
          amountKes: event.prizePoolKes,
        },
        update: {
          state: "PENDING_DEPOSIT",
          amountKes: event.prizePoolKes,
        },
      });
    }

    if (input.action === "VERIFY_ESCROW") {
      const lock = await lockPrizePool({
        eventId: event.id,
        amountKes: Number(event.prizePoolKes),
        paystackReference: `stub_verify_${event.id}`,
      });

      await tx.escrowVault.upsert({
        where: { eventId: event.id },
        create: {
          eventId: event.id,
          state: "PRIZE_VAULT",
          amountKes: event.prizePoolKes,
          paystackReference: `stub_verify_${event.id}`,
          ledgerTxHash: lock.ledgerTxHash,
          publicLedgerUrl: lock.publicLedgerUrl,
        },
        update: {
          state: "PRIZE_VAULT",
          amountKes: event.prizePoolKes,
          paystackReference: `stub_verify_${event.id}`,
          ledgerTxHash: lock.ledgerTxHash,
          publicLedgerUrl: lock.publicLedgerUrl,
        },
      });
    }

    await tx.event.update({
      where: { id: event.id },
      data: { status: toStatus },
    });

    await tx.eventTransition.create({
      data: {
        eventId: event.id,
        actorId: input.actorId,
        action: input.action,
        fromStatus,
        toStatus,
      },
    });
  });

  const updated = await prisma.event.findUniqueOrThrow({
    where: { id: event.id },
    include: ORGANIZER_EVENT_INCLUDE,
  });

  return toApiEvent(updated);
}

export async function listEventTransitions(eventId: string, actorId: string, actorRole: AppRole) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    throw new LifecycleError("NOT_FOUND", "Event not found");
  }
  if (event.organizerId !== actorId && actorRole !== "ADMIN") {
    throw new LifecycleError("FORBIDDEN", "You do not own this event");
  }

  const rows = await prisma.eventTransition.findMany({
    where: { eventId },
    orderBy: { createdAt: "asc" },
    include: { actor: { select: { name: true, email: true } } },
  });

  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    fromStatus: row.fromStatus,
    toStatus: row.toStatus,
    createdAt: row.createdAt.toISOString(),
    actorName: row.actor.name ?? row.actor.email,
  }));
}
