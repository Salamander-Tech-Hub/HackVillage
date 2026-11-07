import { prisma } from "@backend/lib/db";
import { AdminError } from "@backend/services/admin/admin";
import { retryPayout } from "@backend/services/money/payout.service";

export async function writeAdminAudit(input: {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  note?: string;
}) {
  return prisma.adminAuditLog.create({ data: input });
}

export async function getAdminOverview() {
  const [users, events, payouts, failedPayouts, webhookEvents] = await Promise.all([
    prisma.user.count(),
    prisma.event.count(),
    prisma.payout.count(),
    prisma.payout.count({ where: { status: "FAILED" } }),
    prisma.webhookEvent.count(),
  ]);

  return { users, events, payouts, failedPayouts, webhookEvents };
}

export async function listAdminAudit(limit = 20) {
  const rows = await prisma.adminAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 100),
    include: { actor: { select: { email: true, name: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    note: row.note,
    actorEmail: row.actor.email,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function listFailedPayouts() {
  const rows = await prisma.payout.findMany({
    where: { status: "FAILED" },
    orderBy: { createdAt: "desc" },
    include: {
      escrowVault: { select: { eventId: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    eventId: row.escrowVault.eventId,
    phase: row.phase,
    amountKes: Number(row.amountKes),
    idempotencyKey: row.idempotencyKey,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function listRecentTransitions(limit = 20) {
  const rows = await prisma.eventTransition.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 100),
    include: {
      event: { select: { title: true, slug: true } },
      actor: { select: { email: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    fromStatus: row.fromStatus,
    toStatus: row.toStatus,
    eventTitle: row.event.title,
    actorEmail: row.actor.email,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function recoverPayout(actorId: string, payoutId: string) {
  const payout = await prisma.payout.findUnique({ where: { id: payoutId } });
  if (!payout) {
    throw new AdminError("NOT_FOUND", "Payout not found");
  }

  const retried = await retryPayout(payoutId);
  await writeAdminAudit({
    actorId,
    action: "RETRY_PAYOUT",
    targetType: "Payout",
    targetId: payoutId,
    note: `Status ${retried.status}`,
  });
  return {
    id: retried.id,
    status: retried.status,
    transferCode: retried.paystackTransferCode,
  };
}
