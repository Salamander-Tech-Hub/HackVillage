import { prisma } from "@backend/lib/db";
import { applyVerifiedDeposit } from "@backend/services/money/escrow.service";

export async function processPaystackEvent(event: {
  id?: string;
  event?: string;
  data?: {
    id?: number;
    reference?: string;
    amount?: number;
    metadata?: { eventId?: string; purpose?: string };
    transfer_code?: string;
    status?: string;
  };
}): Promise<{ processed: boolean; duplicate?: boolean }> {
  const providerEventId = String(event.id ?? event.data?.id ?? event.data?.reference ?? "");
  if (!providerEventId) {
    return { processed: false };
  }

  const existing = await prisma.webhookEvent.findUnique({
    where: {
      provider_providerEventId: {
        provider: "paystack",
        providerEventId,
      },
    },
  });
  if (existing) {
    return { processed: true, duplicate: true };
  }

  if (event.event === "charge.success") {
    const eventId = event.data?.metadata?.eventId;
    const reference = event.data?.reference;
    const amountKes = event.data?.amount ? Math.round(event.data.amount / 100) : 0;
    if (eventId && reference && amountKes > 0) {
      await applyVerifiedDeposit({ eventId, reference, amountKes });
    }
  }

  if (event.event === "transfer.success" && event.data?.reference) {
    await prisma.payout.updateMany({
      where: { idempotencyKey: event.data.reference },
      data: {
        status: "SUCCESS",
        paystackTransferCode: event.data.transfer_code,
      },
    });
  }

  if (event.event === "transfer.failed" && event.data?.reference) {
    await prisma.payout.updateMany({
      where: { idempotencyKey: event.data.reference },
      data: { status: "FAILED" },
    });
  }

  await prisma.webhookEvent.create({
    data: {
      provider: "paystack",
      providerEventId,
      eventType: event.event ?? "unknown",
    },
  });

  return { processed: true };
}
