import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@backend/lib/paystack", () => ({
  verifyPaystackSignature: vi.fn(),
}));

vi.mock("@backend/services/money/webhook.service", () => ({
  processPaystackEvent: vi.fn(),
}));

import { verifyPaystackSignature } from "@backend/lib/paystack";
import { processPaystackEvent } from "@backend/services/money/webhook.service";
import { POST } from "../../frontend/app/api/webhooks/paystack/route";

describe("POST /api/webhooks/paystack", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test("rejects an invalid signature", async () => {
    vi.mocked(verifyPaystackSignature).mockReturnValue(false);
    const res = await POST(
      new Request("http://localhost/api/webhooks/paystack", {
        method: "POST",
        body: "{}",
      }),
    );
    expect(res.status).toBe(401);
  });

  test("processes a signed event", async () => {
    vi.mocked(verifyPaystackSignature).mockReturnValue(true);
    vi.mocked(processPaystackEvent).mockResolvedValue({ processed: true });
    const res = await POST(
      new Request("http://localhost/api/webhooks/paystack", {
        method: "POST",
        body: JSON.stringify({ event: "charge.success", id: "evt_1" }),
      }),
    );
    expect(res.status).toBe(200);
    expect(processPaystackEvent).toHaveBeenCalled();
  });
});
