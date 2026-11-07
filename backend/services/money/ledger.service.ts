import { prisma } from "@backend/lib/db";
import { recordOnPublicLedger } from "@backend/contracts/escrow";
import type { Prisma } from "@prisma/client";

export async function writeLedgerEntry(input: {
  escrowVaultId: string;
  eventId: string;
  kind: "DEPOSIT" | "INSTANT_50" | "MILESTONE_50";
  amountKes: number;
  metadata?: Prisma.InputJsonObject;
}) {
  const recorded = await recordOnPublicLedger({
    eventId: input.eventId,
    kind: input.kind,
    amountKes: input.amountKes,
  });

  return prisma.ledgerEntry.create({
    data: {
      escrowVaultId: input.escrowVaultId,
      kind: input.kind,
      amountKes: input.amountKes,
      txHash: recorded.txHash,
      publicUrl: recorded.publicUrl,
      metadata: input.metadata,
    },
  });
}

export async function listEventLedger(eventId: string) {
  const vault = await prisma.escrowVault.findUnique({
    where: { eventId },
    include: { ledgerEntries: { orderBy: { createdAt: "asc" } } },
  });

  if (!vault) {
    return { entries: [] as const, publicLedgerUrl: null };
  }

  return {
    publicLedgerUrl: vault.publicLedgerUrl,
    entries: vault.ledgerEntries.map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      amountKes: Number(entry.amountKes),
      txHash: entry.txHash,
      publicUrl: entry.publicUrl,
      createdAt: entry.createdAt.toISOString(),
    })),
  };
}
