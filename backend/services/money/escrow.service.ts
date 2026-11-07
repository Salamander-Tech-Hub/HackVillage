import { prisma } from "@backend/lib/db";
import { createPaystackClient, isPaystackConfigured } from "@backend/lib/paystack";
import { assertPreconditions } from "@backend/services/events/lifecycle";
import { lockPrizePool } from "@backend/services/escrow";
import { writeLedgerEntry } from "@backend/services/money/ledger.service";
import { MoneyError } from "@backend/services/money/money";

export async function initializePrizeDeposit(input: {
  eventId: string;
  actorId: string;
  actorRole: string;
  organizerEmail: string;
  callbackUrl: string;
}) {
  const event = await prisma.event.findUnique({
    where: { id: input.eventId },
    include: { escrowVault: true },
  });
  if (!event) {
    throw new MoneyError("NOT_FOUND", "Event not found");
  }
  if (event.organizerId !== input.actorId && input.actorRole !== "ADMIN") {
    throw new MoneyError("FORBIDDEN", "You do not own this event");
  }
  if (event.status !== "DRAFT" && event.status !== "PENDING_ESCROW") {
    throw new MoneyError("PRECONDITION_FAILED", "Escrow deposits are only opened from draft or pending-escrow events.");
  }
  assertPreconditions("START_ESCROW", {
    status: event.status,
    title: event.title,
    problemStatement: event.problemStatement,
    prizePoolKes: Number(event.prizePoolKes),
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    escrowState: event.escrowVault?.state ?? null,
  });

  const paystackConfigured = isPaystackConfigured();
  let reference = `prize_${event.id}_${Date.now()}`;
  let authorizationUrl: string | null = null;
  if (paystackConfigured) {
    const checkout = await createPaystackClient().initializeTransaction({
      email: input.organizerEmail,
      amountKes: Number(event.prizePoolKes),
      reference,
      eventId: event.id,
      callbackUrl: input.callbackUrl,
    });
    authorizationUrl = checkout.authorizationUrl;
    reference = checkout.reference;
  }

  await prisma.$transaction(async (tx) => {
    if (event.status === "DRAFT") {
      await tx.event.update({
        where: { id: event.id },
        data: { status: "PENDING_ESCROW" },
      });
      await tx.eventTransition.create({
        data: {
          eventId: event.id,
          actorId: input.actorId,
          action: "START_ESCROW",
          fromStatus: "DRAFT",
          toStatus: "PENDING_ESCROW",
        },
      });
    }

    await tx.escrowVault.upsert({
      where: { eventId: event.id },
      create: {
        eventId: event.id,
        state: "PENDING_DEPOSIT",
        amountKes: event.prizePoolKes,
        paystackReference: reference,
      },
      update: {
        state: "PENDING_DEPOSIT",
        amountKes: event.prizePoolKes,
        paystackReference: reference,
      },
    });
  });

  return {
    reference,
    authorizationUrl,
    mode: paystackConfigured ? ("paystack" as const) : ("stub" as const),
  };
}

export async function applyVerifiedDeposit(input: {
  eventId: string;
  reference: string;
  amountKes: number;
}) {
  const event = await prisma.event.findUnique({
    where: { id: input.eventId },
    include: { escrowVault: true },
  });
  if (!event) {
    throw new MoneyError("NOT_FOUND", "Event not found");
  }

  const lock = await lockPrizePool({
    eventId: event.id,
    amountKes: input.amountKes,
    paystackReference: input.reference,
  });

  const vault = await prisma.escrowVault.upsert({
    where: { eventId: event.id },
    create: {
      eventId: event.id,
      state: "PRIZE_VAULT",
      amountKes: input.amountKes,
      paystackReference: input.reference,
      ledgerTxHash: lock.ledgerTxHash,
      publicLedgerUrl: lock.publicLedgerUrl,
    },
    update: {
      state: "PRIZE_VAULT",
      amountKes: input.amountKes,
      paystackReference: input.reference,
      ledgerTxHash: lock.ledgerTxHash,
      publicLedgerUrl: lock.publicLedgerUrl,
    },
  });

  await writeLedgerEntry({
    escrowVaultId: vault.id,
    eventId: event.id,
    kind: "DEPOSIT",
    amountKes: input.amountKes,
    metadata: { reference: input.reference },
  });

  if (event.status === "PENDING_ESCROW" || event.status === "DRAFT") {
    await prisma.event.update({
      where: { id: event.id },
      data: { status: "PRIZE_VERIFIED" },
    });
    await prisma.eventTransition.create({
      data: {
        eventId: event.id,
        actorId: event.organizerId,
        action: "VERIFY_ESCROW",
        fromStatus: event.status,
        toStatus: "PRIZE_VERIFIED",
      },
    });
  }

  return vault;
}
