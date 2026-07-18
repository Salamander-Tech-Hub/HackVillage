import { describe, expect, it } from "vitest";
import { summarizeOverview } from "@/lib/organizerData";
import { MOCK_ORGANIZER_EVENTS } from "@/lib/mockEvents";

describe("summarizeOverview", () => {
  it("computes overview counts from events", () => {
    const result = summarizeOverview(MOCK_ORGANIZER_EVENTS);

    expect(result.totalEvents).toBe(5);
    expect(result.draftEvents).toBe(1);
    expect(result.liveEvents).toBe(1);
    expect(result.prizeVerifiedEvents).toBe(1);
    expect(result.completedEvents).toBe(1);
    expect(result.totalRegistrations).toBe(600);
  });

  it("returns zeroed values for empty arrays", () => {
    const result = summarizeOverview([]);

    expect(result).toEqual({
      totalEvents: 0,
      draftEvents: 0,
      liveEvents: 0,
      prizeVerifiedEvents: 0,
      completedEvents: 0,
      totalRegistrations: 0,
    });
  });
});
