import { describe, expect, it } from "vitest";
import {
  actionsForStatus,
  assertPreconditions,
  assertTransition,
  LifecycleError,
} from "@backend/services/events/lifecycle";

const readyDraft = {
  status: "DRAFT" as const,
  title: "Nairobi Climate Sprint",
  problemStatement: "Track local emissions.",
  prizePoolKes: 500000,
  startsAt: "2026-08-14T08:00:00.000Z",
  endsAt: "2026-08-16T18:00:00.000Z",
  escrowState: null,
};

describe("event lifecycle", () => {
  it("allows only the documented forward transitions", () => {
    expect(assertTransition("DRAFT", "START_ESCROW")).toBe("PENDING_ESCROW");
    expect(assertTransition("PENDING_ESCROW", "VERIFY_ESCROW")).toBe("PRIZE_VERIFIED");
    expect(assertTransition("PRIZE_VERIFIED", "PUBLISH")).toBe("LIVE");
    expect(assertTransition("LIVE", "START_JUDGING")).toBe("JUDGING");
    expect(assertTransition("JUDGING", "CLOSE")).toBe("CLOSED");
    expect(assertTransition("CLOSED", "ARCHIVE")).toBe("ARCHIVED");
  });

  it("rejects skipped or backward transitions", () => {
    expect(() => assertTransition("DRAFT", "PUBLISH")).toThrow(LifecycleError);
    expect(() => assertTransition("LIVE", "START_ESCROW")).toThrow(LifecycleError);
    expect(() => assertTransition("ARCHIVED", "CLOSE")).toThrow(LifecycleError);
  });

  it("lists the next legal action for each status", () => {
    expect(actionsForStatus("DRAFT")).toEqual(["START_ESCROW"]);
    expect(actionsForStatus("PENDING_ESCROW")).toEqual(["VERIFY_ESCROW"]);
    expect(actionsForStatus("PRIZE_VERIFIED")).toEqual(["PUBLISH"]);
    expect(actionsForStatus("LIVE")).toEqual(["START_JUDGING"]);
    expect(actionsForStatus("JUDGING")).toEqual(["CLOSE"]);
    expect(actionsForStatus("CLOSED")).toEqual(["ARCHIVE"]);
    expect(actionsForStatus("ARCHIVED")).toEqual([]);
  });

  it("requires a prize pool before starting escrow", () => {
    expect(() =>
      assertPreconditions("START_ESCROW", { ...readyDraft, prizePoolKes: 0 }),
    ).toThrow(/prize pool/i);
  });

  it("requires start and end times before starting escrow", () => {
    expect(() =>
      assertPreconditions("START_ESCROW", { ...readyDraft, startsAt: null }),
    ).toThrow(/start and end times before starting escrow/i);
    expect(() =>
      assertPreconditions("START_ESCROW", { ...readyDraft, endsAt: null }),
    ).toThrow(/start and end times before starting escrow/i);
  });

  it("requires the end time to be after the start time before starting escrow", () => {
    expect(() =>
      assertPreconditions("START_ESCROW", {
        ...readyDraft,
        endsAt: readyDraft.startsAt,
      }),
    ).toThrow(/end time must be after the start time/i);
  });

  it("accepts a scheduled draft that is ready for escrow", () => {
    expect(() => assertPreconditions("START_ESCROW", readyDraft)).not.toThrow();
  });

  it("requires a verified prize vault before publishing", () => {
    expect(() =>
      assertPreconditions("PUBLISH", {
        ...readyDraft,
        status: "PRIZE_VERIFIED",
        escrowState: "PENDING_DEPOSIT",
      }),
    ).toThrow(/verified/i);
  });

  it("requires a schedule before publishing", () => {
    expect(() =>
      assertPreconditions("PUBLISH", {
        ...readyDraft,
        status: "PRIZE_VERIFIED",
        startsAt: null,
        endsAt: null,
        escrowState: "PRIZE_VAULT",
      }),
    ).toThrow(/start and end/i);
  });

  it("accepts a prize-verified event that is ready to publish", () => {
    expect(() =>
      assertPreconditions("PUBLISH", {
        ...readyDraft,
        status: "PRIZE_VERIFIED",
        escrowState: "PRIZE_VAULT",
      }),
    ).not.toThrow();
  });

  it("blocks closing the event when judging is incomplete", () => {
    expect(() =>
      assertPreconditions("CLOSE", {
        ...readyDraft,
        status: "JUDGING",
        judgingReadiness: {
          isReadyToClose: false,
          missingReason: "Judge Amina B. has 5 pending reviews.",
        },
      }),
    ).toThrow(/Judge Amina B. has 5 pending reviews/i);
  });

  it("accepts closing the event when judging readiness is satisfied", () => {
    expect(() =>
      assertPreconditions("CLOSE", {
        ...readyDraft,
        status: "JUDGING",
        judgingReadiness: {
          isReadyToClose: true,
          missingReason: null,
        },
      }),
    ).not.toThrow();
  });
});
