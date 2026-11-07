import { describe, expect, it } from "vitest";
import { ledgerKindLabel, nextOrganizerStep, transitionActionLabel } from "@/lib/organizerFlow";

describe("organizer flow copy", () => {
  it("tells a draft organizer to fund the prize pool", () => {
    expect(nextOrganizerStep("DRAFT", false)).toMatch(/Fund the prize pool/);
  });

  it("keeps test-mode verify only when Paystack is off", () => {
    expect(nextOrganizerStep("PENDING_ESCROW", false)).toMatch(/test mode/i);
    expect(nextOrganizerStep("PENDING_ESCROW", true)).toMatch(/Paystack checkout/);
  });

  it("names the later steps in order", () => {
    expect(nextOrganizerStep("PRIZE_VERIFIED", true)).toMatch(/Publish/);
    expect(nextOrganizerStep("LIVE", true)).toMatch(/judges/i);
    expect(nextOrganizerStep("JUDGING", true)).toMatch(/Close/);
    expect(nextOrganizerStep("CLOSED", true)).toMatch(/instant 50%/);
  });

  it("labels ledger and lifecycle rows", () => {
    expect(transitionActionLabel("VERIFY_ESCROW")).toBe("Prize verified");
    expect(ledgerKindLabel("INSTANT_50")).toBe("Instant 50%");
  });
});
