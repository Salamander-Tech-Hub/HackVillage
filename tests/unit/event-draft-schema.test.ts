import { describe, expect, it } from "vitest";
import {
  parseCreateDraftInput,
  parsePatchDraftInput,
  validateMergedSchedule,
} from "@/lib/eventDraftSchema";

describe("event draft schema", () => {
  it("accepts valid create payloads", () => {
    const result = parseCreateDraftInput({
      title: "  Green Sprint  ",
      problemStatement: "Build climate solutions for county-level public reporting.",
      prizePoolKes: 250000,
      startsAt: "2026-09-01T10:00:00.000Z",
      endsAt: "2026-09-01T18:00:00.000Z",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.title).toBe("Green Sprint");
    }
  });

  it("rejects invalid create payloads", () => {
    const result = parseCreateDraftInput({
      title: " ",
      problemStatement: "short",
      prizePoolKes: -1,
      startsAt: "2026-09-01T10:00:00.000Z",
      endsAt: "2026-08-31T10:00:00.000Z",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.title).toBeTruthy();
      expect(result.errors.problemStatement).toBeTruthy();
      expect(result.errors.prizePoolKes).toBeTruthy();
      expect(result.errors.endsAt).toBeTruthy();
    }
  });

  it("rejects empty patch payloads", () => {
    const result = parsePatchDraftInput({});
    expect(result.ok).toBe(false);
  });

  it("validates merged schedule relationships", () => {
    const errors = validateMergedSchedule({
      startsAt: "2026-09-01T18:00:00.000Z",
      endsAt: "2026-09-01T17:00:00.000Z",
    });

    expect(errors.endsAt).toContain("after start");
  });
});
