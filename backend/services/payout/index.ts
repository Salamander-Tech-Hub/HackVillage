/**
 * Split disbursement via Paystack (M-Pesa / bank).
 * All operations must be idempotent — retries must never double-pay.
 */

export type DisburseInput = {
  idempotencyKey: string;
  amountKes: number;
  recipient: {
    type: "mpesa" | "bank";
    recipientCode: string;
    name: string;
  };
  reason: "INSTANT_50" | "MILESTONE_50";
};

export type DisburseResult =
  | { ok: true; transferCode: string }
  | { ok: false; error: string; fundsRemainLocked: true };

/**
 * Executes a Paystack transfer. On failure, funds remain locked in the vault.
 */
export async function disburse(input: DisburseInput): Promise<DisburseResult> {
  if (!input.idempotencyKey) {
    return {
      ok: false,
      error: "idempotencyKey is required",
      fundsRemainLocked: true,
    };
  }

  try {
    const { createPaystackClient } = await import("@backend/lib/paystack");
    const client = createPaystackClient();
    const transfer = await client.initiateTransfer({
      amountKes: input.amountKes,
      recipientCode: input.recipient.recipientCode,
      reference: input.idempotencyKey,
      reason: input.reason,
    });
    return { ok: true, transferCode: transfer.transferCode };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Transfer failed",
      fundsRemainLocked: true,
    };
  }
}
