import { createHmac, timingSafeEqual } from "node:crypto";
import { readOptionalEnv } from "@backend/lib/env";

export function getPaystackSecret(): string | undefined {
  const secret = readOptionalEnv("PAYSTACK_SECRET_KEY");
  if (!secret || secret.startsWith("sk_test_...") || secret === "sk_test_...") {
    return undefined;
  }
  return secret;
}

export function isPaystackConfigured(): boolean {
  return Boolean(getPaystackSecret());
}

export function verifyPaystackSignature(rawBody: string, signature: string | null): boolean {
  const secret = getPaystackSecret();
  if (!secret || !signature) {
    return false;
  }

  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(signature);
  return (
    expectedBuffer.length === providedBuffer.length &&
    timingSafeEqual(expectedBuffer, providedBuffer)
  );
}

export type InitializeTransactionInput = {
  email: string;
  amountKes: number;
  reference: string;
  eventId: string;
  callbackUrl?: string;
};

export type PaystackClient = {
  initializeTransaction(
    input: InitializeTransactionInput,
  ): Promise<{ authorizationUrl: string; reference: string }>;
  initiateTransfer(input: {
    amountKes: number;
    recipientCode: string;
    reference: string;
    reason: string;
  }): Promise<{ transferCode: string }>;
};

export function createStubPaystackClient(): PaystackClient {
  return {
    async initializeTransaction(input) {
      return {
        authorizationUrl: `https://checkout.paystack.com/stub-${input.reference}`,
        reference: input.reference,
      };
    },
    async initiateTransfer(input) {
      return { transferCode: `stub-transfer-${input.reference}` };
    },
  };
}

export function createPaystackClient(
  fetchImpl: typeof fetch = fetch,
): PaystackClient {
  const secret = getPaystackSecret();
  if (!secret) {
    return createStubPaystackClient();
  }

  async function paystackRequest<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetchImpl(`https://api.paystack.co${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as {
      status: boolean;
      message?: string;
      data?: T;
    };
    if (!response.ok || !payload.status || !payload.data) {
      throw new Error(payload.message ?? "Paystack request failed");
    }
    return payload.data;
  }

  return {
    async initializeTransaction(input) {
      const data = await paystackRequest<{
        authorization_url: string;
        reference: string;
      }>("/transaction/initialize", {
        email: input.email,
        amount: input.amountKes * 100,
        reference: input.reference,
        callback_url: input.callbackUrl,
        metadata: { eventId: input.eventId, purpose: "PRIZE_DEPOSIT" },
      });
      return {
        authorizationUrl: data.authorization_url,
        reference: data.reference,
      };
    },
    async initiateTransfer(input) {
      const data = await paystackRequest<{ transfer_code: string }>("/transfer", {
        source: "balance",
        amount: input.amountKes * 100,
        recipient: input.recipientCode,
        reason: input.reason,
        reference: input.reference,
      });
      return { transferCode: data.transfer_code };
    },
  };
}
