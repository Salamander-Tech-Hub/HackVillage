import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirstEvent = vi.fn();
const updateEvent = vi.fn();
const findFirstUser = vi.fn();

vi.mock("@backend/lib/db", () => ({
  prisma: {
    event: { findFirst: findFirstEvent, update: updateEvent },
    user: { findFirst: findFirstUser },
  },
}));

function dbEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt_1",
    slug: "event-1",
    title: "Event 1",
    problemStatement: "Solve a meaningful challenge for local communities.",
    status: "DRAFT",
    prizePoolKes: 1200,
    startsAt: new Date("2026-09-01T10:00:00.000Z"),
    endsAt: new Date("2026-09-01T18:00:00.000Z"),
    updatedAt: new Date("2026-07-18T10:00:00.000Z"),
    createdAt: new Date("2026-07-18T09:00:00.000Z"),
    organizerId: "org_1",
    mediaDeadlineAt: null,
    escrowVault: null,
    _count: { submissions: 0 },
    ...overrides,
  };
}

describe("GET /api/events/[eventId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "postgresql://demo";
  });

  it("blocks organizer detail access without auth when mine=1", async () => {
    const { GET } = await import("@/app/api/events/[eventId]/route");

    const response = await GET(
      new Request("http://localhost:3000/api/events/evt_1?mine=1"),
      { params: { eventId: "evt_1" } },
    );

    expect(response.status).toBe(401);
  });

  it("returns 404 when organizer tries to access another organizer's private event", async () => {
    const { GET } = await import("@/app/api/events/[eventId]/route");

    findFirstUser.mockResolvedValue({ id: "org_1", role: "ORGANIZER" });
    findFirstEvent.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost:3000/api/events/evt_other?mine=1", {
        headers: { "x-hackvillage-user-id": "org_1" },
      }),
      { params: { eventId: "evt_other" } },
    );

    expect(response.status).toBe(404);
    expect(findFirstEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizerId: "org_1" }),
      }),
    );
  });

  it("updates a draft event for the owning organizer", async () => {
    const { PATCH } = await import("@/app/api/events/[eventId]/route");

    findFirstUser.mockResolvedValue({ id: "org_1", role: "ORGANIZER" });
    findFirstEvent.mockResolvedValue(dbEvent());
    updateEvent.mockResolvedValue(
      dbEvent({ title: "Updated title", endsAt: new Date("2026-09-01T19:00:00.000Z") }),
    );

    const response = await PATCH(
      new Request("http://localhost:3000/api/events/evt_1", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-hackvillage-user-id": "org_1",
        },
        body: JSON.stringify({
          title: "Updated title",
          endsAt: "2026-09-01T19:00:00.000Z",
        }),
      }),
      { params: { eventId: "evt_1" } },
    );

    expect(response.status).toBe(200);
    expect(updateEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "evt_1" },
      }),
    );
  });

  it("rejects patch updates for non-owners", async () => {
    const { PATCH } = await import("@/app/api/events/[eventId]/route");

    findFirstUser.mockResolvedValue({ id: "org_1", role: "ORGANIZER" });
    findFirstEvent.mockResolvedValue(dbEvent({ organizerId: "org_2" }));

    const response = await PATCH(
      new Request("http://localhost:3000/api/events/evt_1", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-hackvillage-user-id": "org_1",
        },
        body: JSON.stringify({ title: "Updated title" }),
      }),
      { params: { eventId: "evt_1" } },
    );

    expect(response.status).toBe(403);
  });

  it("rejects empty patch payloads", async () => {
    const { PATCH } = await import("@/app/api/events/[eventId]/route");

    findFirstUser.mockResolvedValue({ id: "org_1", role: "ORGANIZER" });
    findFirstEvent.mockResolvedValue(dbEvent());

    const response = await PATCH(
      new Request("http://localhost:3000/api/events/evt_1", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-hackvillage-user-id": "org_1",
        },
        body: JSON.stringify({}),
      }),
      { params: { eventId: "evt_1" } },
    );

    const body = await response.json();
    expect(response.status).toBe(422);
    expect(body.errors.form).toContain("At least one field");
  });

  it("rejects updates to non-draft events", async () => {
    const { PATCH } = await import("@/app/api/events/[eventId]/route");

    findFirstUser.mockResolvedValue({ id: "org_1", role: "ORGANIZER" });
    findFirstEvent.mockResolvedValue(dbEvent({ status: "LIVE" }));

    const response = await PATCH(
      new Request("http://localhost:3000/api/events/evt_1", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-hackvillage-user-id": "org_1",
        },
        body: JSON.stringify({ title: "Updated title" }),
      }),
      { params: { eventId: "evt_1" } },
    );

    expect(response.status).toBe(409);
  });
});
