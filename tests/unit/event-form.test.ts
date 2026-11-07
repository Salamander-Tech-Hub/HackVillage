import { describe, expect, it } from "vitest";
import { emptyEventFormValues, parseEventForm } from "@/lib/eventForm";

describe("parseEventForm", () => {
  it("accepts a complete draft payload", () => {
    const result = parseEventForm({
      title: "Nairobi Climate Sprint",
      problemStatement: "Track local emissions.",
      prizePoolKes: "500000",
      startsAt: "2026-08-14T11:00",
      endsAt: "2026-08-16T21:00",
      location: "Nairobi Garage",
      format: "IN_PERSON",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.title).toBe("Nairobi Climate Sprint");
      expect(result.data.prizePoolKes).toBe(500000);
      expect(result.data.location).toBe("Nairobi Garage");
      expect(result.data.format).toBe("IN_PERSON");
      expect(result.data.startsAt).toBeTruthy();
      expect(result.data.endsAt).toBeTruthy();
    }
  });

  it("allows a draft without dates or location", () => {
    const result = parseEventForm({
      ...emptyEventFormValues(),
      title: "Draft Lab",
      problemStatement: "Prototype civic tools.",
      prizePoolKes: "0",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.startsAt).toBeNull();
      expect(result.data.location).toBeNull();
    }
  });

  it("rejects a missing title and a fractional prize", () => {
    const result = parseEventForm({
      ...emptyEventFormValues(),
      title: "  ",
      problemStatement: "Something",
      prizePoolKes: "10.5",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.title).toBeTruthy();
      expect(result.errors.prizePoolKes).toBeTruthy();
    }
  });

  it("rejects an end time that is not after the start time", () => {
    const result = parseEventForm({
      ...emptyEventFormValues(),
      title: "Sprint",
      problemStatement: "Build something",
      prizePoolKes: "1000",
      startsAt: "2026-08-16T21:00",
      endsAt: "2026-08-14T11:00",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.endsAt).toMatch(/after/i);
    }
  });
});
