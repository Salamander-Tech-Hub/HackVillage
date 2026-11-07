import { describe, expect, it } from "vitest";
import { toApiEvent, type OrganizerEventRecord } from "@backend/services/events/events.service";

function makeEvent(
  overrides: Partial<OrganizerEventRecord> = {},
): OrganizerEventRecord {
  return {
    id: "evt_1",
    slug: "nairobi-climate-sprint",
    title: "Nairobi Climate Sprint",
    problemStatement: "Track local emissions.",
    status: "PRIZE_VERIFIED",
    prizePoolKes: 500000,
    startsAt: new Date("2026-08-14T08:00:00.000Z"),
    endsAt: new Date("2026-08-16T18:00:00.000Z"),
    location: "Nairobi Garage",
    format: "IN_PERSON",
    organizerId: "org_1",
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    updatedAt: new Date("2026-07-10T10:20:00.000Z"),
    escrowVault: {
      state: "PRIZE_VAULT",
      amountKes: 500000,
      publicLedgerUrl: "https://amoy.polygonscan.com/tx/0xseedlock",
    },
    _count: { submissions: 12, registrations: 5 },
    ...overrides,
  };
}

describe("toApiEvent", () => {
  it("maps the organizer dashboard contract including counts and escrow", () => {
    const event = toApiEvent(makeEvent());

    expect(event).toMatchObject({
      id: "evt_1",
      slug: "nairobi-climate-sprint",
      title: "Nairobi Climate Sprint",
      problemStatement: "Track local emissions.",
      problem_statement: "Track local emissions.",
      status: "PRIZE_VERIFIED",
      prizePoolKes: 500000,
      prize_total: 500000,
      startsAt: "2026-08-14T08:00:00.000Z",
      start: "2026-08-14T08:00:00.000Z",
      endsAt: "2026-08-16T18:00:00.000Z",
      end: "2026-08-16T18:00:00.000Z",
      location: "Nairobi Garage",
      format: "IN_PERSON",
      registrationsCount: 5,
      submissionsCount: 12,
      organizerId: "org_1",
      escrow: {
        state: "PRIZE_VAULT",
        amountKes: 500000,
        publicLedgerUrl: "https://amoy.polygonscan.com/tx/0xseedlock",
      },
      allowedActions: ["PUBLISH"],
    });
  });

  it("returns null location, format, and escrow when those fields are absent", () => {
    const event = toApiEvent(
      makeEvent({
        location: null,
        format: null,
        startsAt: null,
        endsAt: null,
        escrowVault: null,
        _count: { submissions: 0, registrations: 0 },
      }),
    );

    expect(event.location).toBeNull();
    expect(event.format).toBeNull();
    expect(event.startsAt).toBeNull();
    expect(event.endsAt).toBeNull();
    expect(event.escrow).toBeNull();
    expect(event.registrationsCount).toBe(0);
    expect(event.submissionsCount).toBe(0);
  });
});
