import { describe, expect, it } from "vitest";
import { toOrganizerEventHref } from "@/lib/organizerRoutes";
import type { OrganizerEvent } from "@/lib/types";

describe("toOrganizerEventHref", () => {
  it("navigates by event id", () => {
    const event: OrganizerEvent = {
      id: "evt_123",
      slug: "demo",
      title: "Demo Event",
      problemStatement: null,
      status: "DRAFT",
      prizePoolKes: 1000,
      startsAt: null,
      endsAt: null,
      location: null,
      format: null,
      registrationsCount: null,
      submissionsCount: 0,
      updatedAt: null,
      escrow: null,
    };

    expect(toOrganizerEventHref(event)).toBe("/organizer/events/evt_123");
  });
});
