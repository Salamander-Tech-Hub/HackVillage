import { createHash } from "node:crypto";
import { prisma } from "@backend/lib/db";
import { writeLedgerEntry } from "@backend/services/money/ledger.service";
import { MoneyError, splitPrizePool } from "@backend/services/money/money";
import { disburse } from "@backend/services/payout";

function payoutTransferReference(eventId: string, phase: "INSTANT_50" | "MILESTONE_50", submissionId: string): string {
  const key = eventId + ":" + phase + ":" + submissionId;
  return "hv_" + createHash("sha256").update(key).digest("hex").slice(0, 40);
}

export async function listEventPayouts(input: {
  eventId: string;
  actorId: string;
  actorRole: string;
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
  if (!event.escrowVault) {
    return [];
  }

  const rows = await prisma.payout.findMany({
    where: { escrowVaultId: event.escrowVault.id },
    orderBy: { createdAt: "asc" },
    include: { submission: { select: { title: true } } },
  });

  return rows.map((row) => ({
    id: row.id,
    phase: row.phase,
    status: row.status,
    amountKes: Number(row.amountKes),
    submissionTitle: row.submission?.title ?? null,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function declareWinners(input: {
  eventId: string;
  actorId: string;
  actorRole: string;
  submissionIds: string[];
}) {
  const event = await prisma.event.findUnique({ where: { id: input.eventId } });
  if (!event) {
    throw new MoneyError("NOT_FOUND", "Event not found");
  }
  if (event.organizerId !== input.actorId && input.actorRole !== "ADMIN") {
    throw new MoneyError("FORBIDDEN", "You do not own this event");
  }
  if (event.status !== "JUDGING" && event.status !== "CLOSED") {
    throw new MoneyError("PRECONDITION_FAILED", "Winners can only be declared during judging or after close.");
  }
  if (input.submissionIds.length === 0) {
    throw new MoneyError("PRECONDITION_FAILED", "Select at least one winning submission.");
  }

  const submissions = await prisma.submission.findMany({
    where: { eventId: event.id, id: { in: input.submissionIds } },
  });
  if (submissions.length !== input.submissionIds.length) {
    throw new MoneyError("NOT_FOUND", "One or more submissions were not found on this event.");
  }

  await prisma.$transaction([
    prisma.submission.updateMany({
      where: { eventId: event.id },
      data: { isWinner: false },
    }),
    prisma.submission.updateMany({
      where: { id: { in: input.submissionIds } },
      data: { isWinner: true },
    }),
  ]);

  return prisma.submission.findMany({
    where: { eventId: event.id, isWinner: true },
    select: { id: true, title: true, teamId: true },
  });
}

export async function runPayoutPhase(input: {
  eventId: string;
  actorId: string;
  actorRole: string;
  phase: "INSTANT_50" | "MILESTONE_50";
}) {
  const event = await prisma.event.findUnique({
    where: { id: input.eventId },
    include: {
      escrowVault: true,
      submissions: {
        where: { isWinner: true },
        include: {
          team: { include: { members: { include: { user: { include: { payoutRecipients: true } } } } } },
        },
      },
    },
  });
  if (!event) {
    throw new MoneyError("NOT_FOUND", "Event not found");
  }
  if (event.organizerId !== input.actorId && input.actorRole !== "ADMIN") {
    throw new MoneyError("FORBIDDEN", "You do not own this event");
  }
  if (event.status !== "CLOSED") {
    throw new MoneyError("PRECONDITION_FAILED", "Payouts start only after the event is closed.");
  }
  if (!event.escrowVault || event.escrowVault.state === "PENDING_DEPOSIT") {
    throw new MoneyError("PRECONDITION_FAILED", "Prize vault must be verified before payouts.");
  }
  if (input.phase === "MILESTONE_50" && event.escrowVault.state !== "PARTIAL_RELEASED") {
    throw new MoneyError("PRECONDITION_FAILED", "Run the instant 50% payout before the milestone release.");
  }
  if (input.phase === "INSTANT_50" && event.escrowVault.state === "FULLY_RELEASED") {
    throw new MoneyError("PRECONDITION_FAILED", "This vault has already been fully released.");
  }

  const winners = event.submissions;
  const { instantKes, milestoneKes } = splitPrizePool(Number(event.prizePoolKes), winners.length);
  const amountKes = input.phase === "INSTANT_50" ? instantKes : milestoneKes;
  const results = [];

  for (const submission of winners) {
    const payee = submission.team.members[0]?.user;
    const recipient = payee?.payoutRecipients[0];
    if (!payee || !recipient?.paystackRecipientCode) {
      throw new MoneyError(
        "PRECONDITION_FAILED",
        "Every winning team needs a verified payout recipient before funds can move.",
      );
    }

    if (!recipient.paystackRecipientCode) {
      throw new MoneyError("PRECONDITION_FAILED", "Every winning team needs a registered Paystack payout recipient before funds can move.");
    }

    const legacyKey = event.id + ":" + input.phase + ":" + submission.id;
    const idempotencyKey = payoutTransferReference(event.id, input.phase, submission.id);
    const existing = await prisma.payout.findFirst({
      where: { OR: [{ idempotencyKey }, { idempotencyKey: legacyKey }] },
    });
    if (existing?.status === "SUCCESS") {
      results.push(existing);
      continue;
    }
    if (existing && existing.idempotencyKey !== idempotencyKey) {
      await prisma.payout.update({ where: { id: existing.id }, data: { idempotencyKey } });
    }

    const transfer = await disburse({
      idempotencyKey,
      amountKes,
      recipient: {
        type: recipient.method === "BANK" ? "bank" : "mpesa",
        recipientCode: recipient.paystackRecipientCode,
        name: recipient.accountName,
      },
      reason: input.phase,
    });

    if (!transfer.ok) {
      const failed = await prisma.payout.upsert({
        where: { idempotencyKey },
        create: {
          escrowVaultId: event.escrowVault.id,
          submissionId: submission.id,
          phase: input.phase,
          amountKes,
          idempotencyKey,
          status: "FAILED",
        },
        update: { status: "FAILED" },
      });
      results.push(failed);
      continue;
    }

    const pending = await prisma.payout.upsert({
      where: { idempotencyKey },
      create: {
        escrowVaultId: event.escrowVault.id,
        submissionId: submission.id,
        phase: input.phase,
        amountKes,
        idempotencyKey,
        paystackTransferCode: transfer.transferCode,
        status: "PENDING",
      },
      update: { paystackTransferCode: transfer.transferCode, status: "PENDING" },
    });

    let ledger;
    try {
      ledger = await writeLedgerEntry({
        escrowVaultId: event.escrowVault.id,
        eventId: event.id,
        kind: input.phase,
        amountKes,
        metadata: { submissionId: submission.id },
      });
    } catch {
      // The transfer was accepted; do not mark it retryable as FAILED.
      results.push(pending);
      continue;
    }

    const saved = await prisma.payout.upsert({
      where: { idempotencyKey },
      create: {
        escrowVaultId: event.escrowVault.id,
        submissionId: submission.id,
        phase: input.phase,
        amountKes,
        idempotencyKey,
        paystackTransferCode: transfer.transferCode,
        ledgerTxHash: ledger.txHash,
        status: "SUCCESS",
      },
      update: {
        paystackTransferCode: transfer.transferCode,
        ledgerTxHash: ledger.txHash,
        status: "SUCCESS",
      },
    });
    results.push(saved);
  }

  const allSucceeded = results.every((row) => row.status === "SUCCESS");
  if (allSucceeded) {
    await prisma.escrowVault.update({
      where: { id: event.escrowVault.id },
      data: {
        state: input.phase === "INSTANT_50" ? "PARTIAL_RELEASED" : "FULLY_RELEASED",
      },
    });
  }

  return {
    phase: input.phase,
    payouts: results.map((row) => ({
      id: row.id,
      status: row.status,
      amountKes: Number(row.amountKes),
      idempotencyKey: row.idempotencyKey,
      transferCode: row.paystackTransferCode,
    })),
  };
}

export async function retryPayout(payoutId: string) {
  const payout = await prisma.payout.findUnique({
    where: { id: payoutId },
    include: {
      escrowVault: { include: { event: true } },
      submission: {
        include: {
          team: { include: { members: { include: { user: { include: { payoutRecipients: true } } } } } },
        },
      },
    },
  });
  if (!payout) {
    throw new MoneyError("NOT_FOUND", "Payout not found");
  }
  if (payout.status !== "FAILED") {
    throw new MoneyError("PRECONDITION_FAILED", "Only failed payouts can be retried.");
  }
  if (payout.escrowVault.event.status !== "CLOSED") {
    throw new MoneyError("PRECONDITION_FAILED", "Payouts can only be retried after the event is closed.");
  }
  if (
    payout.phase === "MILESTONE_50" &&
    payout.escrowVault.state !== "PARTIAL_RELEASED"
  ) {
    throw new MoneyError("PRECONDITION_FAILED", "The instant 50% payout must be completed before the milestone release.");
  }
  if (
    payout.phase === "INSTANT_50" &&
    payout.escrowVault.state === "FULLY_RELEASED"
  ) {
    throw new MoneyError("PRECONDITION_FAILED", "This prize vault has already been fully released.");
  }

  const recipient = payout.submission?.team.members[0]?.user.payoutRecipients[0];
  if (!recipient?.paystackRecipientCode) {
    throw new MoneyError("PRECONDITION_FAILED", "A registered Paystack payout recipient is required before retrying.");
  }

  const claimed = await prisma.payout.updateMany({
    where: { id: payout.id, status: "FAILED" },
    data: { status: "PENDING" },
  });
  if (claimed.count !== 1) {
    throw new MoneyError("PRECONDITION_FAILED", "This payout is already being processed. Refresh and try again.");
  }

  // Reuse the original reference on retries to avoid duplicate transfers if Paystack accepted the first request but its response was lost.
  const transfer = await disburse({
    idempotencyKey: payout.idempotencyKey,
    amountKes: Number(payout.amountKes),
    recipient: {
      type: recipient.method === "BANK" ? "bank" : "mpesa",
      recipientCode: recipient.paystackRecipientCode,
      name: recipient.accountName,
    },
    reason: payout.phase,
  });

  if (!transfer.ok) {
    await prisma.payout.update({
      where: { id: payout.id },
      data: { status: "FAILED" },
    });
    throw new MoneyError("PRECONDITION_FAILED", `Paystack transfer failed: ${transfer.error}`);
  }

  let ledger;
  try {
    ledger = await writeLedgerEntry({
      escrowVaultId: payout.escrowVaultId,
      eventId: payout.escrowVault.event.id,
      kind: payout.phase,
      amountKes: Number(payout.amountKes),
      metadata: { submissionId: payout.submissionId ?? "" },
    });
  } catch {
    await prisma.payout.update({
      where: { id: payout.id },
      data: { status: "PENDING", paystackTransferCode: transfer.transferCode },
    });
    throw new MoneyError("PRECONDITION_FAILED", "The transfer was accepted but its ledger entry could not be recorded. The payout was left pending to prevent a duplicate transfer.");
  }

  const updated = await prisma.payout.update({
    where: { id: payout.id },
    data: {
      status: "SUCCESS",
      paystackTransferCode: transfer.transferCode,
      ledgerTxHash: ledger.txHash,
    },
  });

  const phasePayouts = await prisma.payout.findMany({
    where: {
      escrowVaultId: payout.escrowVaultId,
      phase: payout.phase,
    },
    select: { status: true },
  });

  if (phasePayouts.length > 0 && phasePayouts.every((row) => row.status === "SUCCESS")) {
    await prisma.escrowVault.update({
      where: { id: payout.escrowVaultId },
      data: {
        state: payout.phase === "INSTANT_50" ? "PARTIAL_RELEASED" : "FULLY_RELEASED",
      },
    });
  }

  return updated;
}
