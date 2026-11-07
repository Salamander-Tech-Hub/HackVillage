import { createHash } from "node:crypto";
import { prisma } from "@backend/lib/db";
import { maskAccount, MoneyError } from "@backend/services/money/money";

export type RecipientInput = {
  type: "MPESA" | "BANK";
  account: string;
  displayName: string;
};

export type PublicRecipient = {
  type: "MPESA" | "BANK";
  displayName: string;
  maskedAccount: string;
  verified: boolean;
};

function fingerprint(account: string): string {
  return createHash("sha256").update(account.replace(/\s+/g, "").toLowerCase()).digest("hex");
}

export async function upsertRecipient(
  userId: string,
  input: RecipientInput,
): Promise<PublicRecipient> {
  const account = input.account.trim();
  if (account.length < 6) {
    throw new MoneyError("PRECONDITION_FAILED", "Enter a valid payout account.");
  }

  const record = await prisma.payoutRecipient.upsert({
    where: { userId },
    create: {
      userId,
      type: input.type,
      displayName: input.displayName.trim(),
      maskedAccount: maskAccount(account),
      accountFingerprint: fingerprint(account),
      paystackRecipientCode: `stub_rcp_${userId}`,
      verifiedAt: new Date(),
    },
    update: {
      type: input.type,
      displayName: input.displayName.trim(),
      maskedAccount: maskAccount(account),
      accountFingerprint: fingerprint(account),
      paystackRecipientCode: `stub_rcp_${userId}`,
      verifiedAt: new Date(),
    },
  });

  return toPublicRecipient(record);
}

export async function getRecipient(userId: string): Promise<PublicRecipient | null> {
  const record = await prisma.payoutRecipient.findUnique({ where: { userId } });
  return record ? toPublicRecipient(record) : null;
}

function toPublicRecipient(record: {
  type: string;
  displayName: string;
  maskedAccount: string;
  verifiedAt: Date | null;
}): PublicRecipient {
  return {
    type: record.type === "BANK" ? "BANK" : "MPESA",
    displayName: record.displayName,
    maskedAccount: record.maskedAccount,
    verified: Boolean(record.verifiedAt),
  };
}
