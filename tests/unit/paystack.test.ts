import { afterEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";

const originalSecret = process.env.PAYSTACK_SECRET_KEY;

afterEach(() => {
  vi.resetModules();
  if (originalSecret === undefined) {
    delete process.env.PAYSTACK_SECRET_KEY;
  } else {
    process.env.PAYSTACK_SECRET_KEY = originalSecret;
  }
});

describe("Paystack webhook signatures", () => {
  it("accepts a matching HMAC and rejects a bad one", async () => {
    process.env.PAYSTACK_SECRET_KEY = "sk_test_unit";
    const { verifyPaystackSignature } = await import("@backend/lib/paystack");
    const body = JSON.stringify({ event: "charge.success" });
    const signature = createHmac("sha512", "sk_test_unit").update(body).digest("hex");

    expect(verifyPaystackSignature(body, signature)).toBe(true);
    expect(verifyPaystackSignature(body, "nope")).toBe(false);
  });
});
