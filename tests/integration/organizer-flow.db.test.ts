import { afterAll, describe, expect, it } from "vitest";
import {
  assertPreconditions,
  assertTransition,
  type LifecycleEventSnapshot,
  type LifecycleStatus,
} from "@backend/services/events/lifecycle";

/**
 * Walks the organizer path on a real Postgres and checks each saved row.
 * Skipped when DATABASE_URL is unset, so mocked unit tests still run anywhere.
 * The browser smoke test stays open until the organizer screens can drive this path.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);
const PRIZE_KES = 100_000;

describe.skipIf(!hasDatabase)("organizer flow against Postgres (#83)", () => {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  let disconnect: (() => Promise<void>) | null = null;

  afterAll(async () => {
    if (disconnect) await disconnect();
  });

  it("funds, verifies, publishes, judges, closes, then pays both halves", async () => {
    const { prisma } = await import("@backend/lib/db");
    disconnect = () => prisma.$disconnect();

    const organizer = await prisma.user.create({
      data: { email: `org83-${stamp}-organizer@hackvillage.test`, role: "ORGANIZER", name: "Flow Organizer" },
    });
    const developer = await prisma.user.create({
      data: { email: `org83-${stamp}-dev@hackvillage.test`, role: "DEVELOPER", name: "Flow Developer" },
    });
    const judge = await prisma.user.create({
      data: { email: `org83-${stamp}-judge@hackvillage.test`, role: "JUDGE", name: "Flow Judge" },
    });

    const startsAt = new Date("2026-09-01T08:00:00Z");
    const endsAt = new Date("2026-09-03T18:00:00Z");
    let eventId = "";

    try {
      const event = await prisma.event.create({
        data: {
          slug: `org83-flow-${stamp}`,
          title: "Org 83 flow check",
          problemStatement: "Prove the organizer path can be stored.",
          status: "DRAFT",
          prizePoolKes: PRIZE_KES,
          startsAt,
          endsAt,
          organizerId: organizer.id,
        },
      });
      eventId = event.id;
      expect(event.status).toBe("DRAFT");

      const snapshot = (): LifecycleEventSnapshot => ({
        status: "DRAFT",
        title: event.title,
        problemStatement: event.problemStatement,
        prizePoolKes: PRIZE_KES,
        startsAt,
        endsAt,
        escrowState: null,
      });

      assertPreconditions("START_ESCROW", snapshot());
      let status: LifecycleStatus = assertTransition("DRAFT", "START_ESCROW");
      await prisma.event.update({ where: { id: eventId }, data: { status } });
      const vault = await prisma.escrowVault.create({
        data: {
          eventId,
          state: "PENDING_DEPOSIT",
          amountKes: PRIZE_KES,
          paystackReference: `stub-deposit-${stamp}`,
        },
      });
      await prisma.ledgerEntry.create({
        data: {
          escrowVaultId: vault.id,
          kind: "DEPOSIT",
          amountKes: PRIZE_KES,
          txHash: `stub-deposit-${stamp}`,
        },
      });
      await prisma.eventTransition.create({
        data: {
          eventId,
          action: "START_ESCROW",
          fromStatus: "DRAFT",
          toStatus: status,
          actorId: organizer.id,
        },
      });
      const funded = await prisma.event.findUniqueOrThrow({
        where: { id: eventId },
        include: { escrowVault: true },
      });
      expect(funded.status).toBe("PENDING_ESCROW");
      expect(funded.escrowVault?.state).toBe("PENDING_DEPOSIT");

      assertPreconditions("VERIFY_ESCROW", { ...snapshot(), status, escrowState: "PENDING_DEPOSIT" });
      const verifiedFrom = status;
      status = assertTransition(status, "VERIFY_ESCROW");
      await prisma.escrowVault.update({
        where: { id: vault.id },
        data: { state: "PRIZE_VAULT", ledgerTxHash: `stub-lock-${stamp}` },
      });
      await prisma.event.update({ where: { id: eventId }, data: { status } });
      await prisma.eventTransition.create({
        data: {
          eventId,
          action: "VERIFY_ESCROW",
          fromStatus: verifiedFrom,
          toStatus: status,
          actorId: organizer.id,
        },
      });
      const verified = await prisma.escrowVault.findUniqueOrThrow({ where: { id: vault.id } });
      expect(status).toBe("PRIZE_VERIFIED");
      expect(verified.state).toBe("PRIZE_VAULT");

      assertPreconditions("PUBLISH", { ...snapshot(), status, escrowState: "PRIZE_VAULT" });
      const publishedFrom = status;
      status = assertTransition(status, "PUBLISH");
      await prisma.event.update({ where: { id: eventId }, data: { status } });
      await prisma.eventTransition.create({
        data: {
          eventId,
          action: "PUBLISH",
          fromStatus: publishedFrom,
          toStatus: status,
          actorId: organizer.id,
        },
      });
      expect(status).toBe("LIVE");

      const judgingFrom = status;
      status = assertTransition(status, "START_JUDGING");
      await prisma.event.update({ where: { id: eventId }, data: { status } });
      await prisma.judgeAssignment.create({ data: { eventId, judgeId: judge.id } });
      const team = await prisma.team.create({ data: { eventId, name: "Flow Team" } });
      await prisma.teamMember.create({ data: { teamId: team.id, userId: developer.id } });
      const submission = await prisma.submission.create({
        data: { eventId, teamId: team.id, title: "Flow demo", status: "DEMO" },
      });
      await prisma.eventTransition.create({
        data: {
          eventId,
          action: "START_JUDGING",
          fromStatus: judgingFrom,
          toStatus: status,
          actorId: organizer.id,
        },
      });
      const review = await prisma.judgeFeedback.create({
        data: {
          submissionId: submission.id,
          judgeId: judge.id,
          score: 90,
          points: ["Clear problem", "Working demo", "Usable by residents"],
        },
      });
      expect(status).toBe("JUDGING");
      expect(review.points).toHaveLength(3);

      const closedFrom = status;
      status = assertTransition(status, "CLOSE");
      await prisma.event.update({ where: { id: eventId }, data: { status } });
      await prisma.eventTransition.create({
        data: {
          eventId,
          action: "CLOSE",
          fromStatus: closedFrom,
          toStatus: status,
          actorId: organizer.id,
        },
      });
      expect(status).toBe("CLOSED");

      const recipient = await prisma.payoutRecipient.create({
        data: {
          userId: developer.id,
          method: "MPESA",
          accountRef: `2547${stamp.slice(-8)}`,
          accountName: "Flow Developer",
          verifiedAt: new Date("2026-09-04T09:00:00Z"),
        },
      });
      const winner = await prisma.submission.update({
        where: { id: submission.id },
        data: {
          isWinner: true,
          winnerRank: 1,
          prizeAmountKes: PRIZE_KES,
          payoutRecipientId: recipient.id,
        },
      });
      expect(winner.isWinner).toBe(true);
      expect(winner.winnerRank).toBe(1);
      expect(Number(winner.prizeAmountKes)).toBe(PRIZE_KES);

      const instant = await prisma.payout.create({
        data: {
          escrowVaultId: vault.id,
          submissionId: submission.id,
          phase: "INSTANT_50",
          amountKes: PRIZE_KES / 2,
          idempotencyKey: `org83-${stamp}-instant`,
          paystackTransferCode: `stub-transfer-${stamp}-instant`,
          status: "SUCCESS",
        },
      });
      await prisma.ledgerEntry.create({
        data: {
          escrowVaultId: vault.id,
          kind: "INSTANT_50",
          amountKes: PRIZE_KES / 2,
          txHash: `stub-transfer-${stamp}-instant`,
        },
      });
      await prisma.escrowVault.update({ where: { id: vault.id }, data: { state: "PARTIAL_RELEASED" } });
      expect(instant.status).toBe("SUCCESS");
      expect(Number(instant.amountKes)).toBe(PRIZE_KES / 2);

      const milestone = await prisma.milestone.create({
        data: {
          submissionId: submission.id,
          reportUrl: "https://example.org/handover/org83-flow",
          submittedAt: new Date("2026-09-10T10:00:00Z"),
          approvedById: organizer.id,
          approvedAt: new Date("2026-09-11T10:00:00Z"),
        },
      });
      const secondHalf = await prisma.payout.create({
        data: {
          escrowVaultId: vault.id,
          submissionId: submission.id,
          phase: "MILESTONE_50",
          amountKes: PRIZE_KES / 2,
          idempotencyKey: `org83-${stamp}-milestone`,
          paystackTransferCode: `stub-transfer-${stamp}-milestone`,
          status: "SUCCESS",
        },
      });
      await prisma.ledgerEntry.create({
        data: {
          escrowVaultId: vault.id,
          kind: "MILESTONE_50",
          amountKes: PRIZE_KES / 2,
          txHash: `stub-transfer-${stamp}-milestone`,
        },
      });
      const released = await prisma.escrowVault.update({
        where: { id: vault.id },
        data: { state: "FULLY_RELEASED" },
      });

      expect(milestone.approvedAt).not.toBeNull();
      expect(secondHalf.phase).toBe("MILESTONE_50");
      expect(released.state).toBe("FULLY_RELEASED");

      const [transitions, ledger, payouts] = await Promise.all([
        prisma.eventTransition.findMany({ where: { eventId }, orderBy: { createdAt: "asc" } }),
        prisma.ledgerEntry.findMany({ where: { escrowVaultId: vault.id } }),
        prisma.payout.findMany({ where: { escrowVaultId: vault.id } }),
      ]);
      expect(transitions.map((row) => row.action)).toEqual([
        "START_ESCROW",
        "VERIFY_ESCROW",
        "PUBLISH",
        "START_JUDGING",
        "CLOSE",
      ]);
      expect(ledger.map((row) => row.kind).sort()).toEqual(["DEPOSIT", "INSTANT_50", "MILESTONE_50"]);
      expect(payouts.reduce((sum, row) => sum + Number(row.amountKes), 0)).toBe(PRIZE_KES);
    } finally {
      if (eventId) {
        await prisma.submission.updateMany({
          where: { eventId },
          data: { payoutRecipientId: null },
        });
        await prisma.payout.deleteMany({ where: { escrowVault: { eventId } } });
        await prisma.event.delete({ where: { id: eventId } });
      }
      await prisma.user.deleteMany({
        where: { id: { in: [organizer.id, developer.id, judge.id] } },
      });
    }
  });
});
