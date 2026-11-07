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

export async function upsertRecipient(
  userId: string,
  input: RecipientInput,
): Promise<PublicRecipient> {
  const account = input.account.trim();
  if (account.length < 6) {
    throw new MoneyError("PRECONDITION_FAILED", "Enter a valid payout account.");
  }

  const data = {
    method: input.type,
    accountRef: account,
    accountName: input.displayName.trim(),
    paystackRecipientCode: `stub_rcp_${userId}`,
    verifiedAt: new Date(),
  };
  const existing = await prisma.payoutRecipient.findFirst({ where: { userId } });
  const record = existing
    ? await prisma.payoutRecipient.update({ where: { id: existing.id }, data })
    : await prisma.payoutRecipient.create({ data: { userId, ...data } });

  return toPublicRecipient(record);
}

export async function getRecipient(userId: string): Promise<PublicRecipient | null> {
  const record = await prisma.payoutRecipient.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return record ? toPublicRecipient(record) : null;
}

function toPublicRecipient(record: {
  method: string;
  accountName: string;
  accountRef: string;
  verifiedAt: Date | null;
}): PublicRecipient {
  return {
    type: record.method === "BANK" ? "BANK" : "MPESA",
    displayName: record.accountName,
    maskedAccount: maskAccount(record.accountRef),
    verified: Boolean(record.verifiedAt),
  };
}
