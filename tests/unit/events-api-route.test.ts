import { beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();
const findUniqueEvent = vi.fn();
const createEvent = vi.fn();
const findFirstUser = vi.fn();

vi.mock("@backend/lib/db", () => ({
  prisma: {
    event: { findMany, findUnique: findUniqueEvent, create: createEvent },
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

describe("GET /api/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "postgresql://demo";
    findUniqueEvent.mockResolvedValue(null);
  });

  it("returns 401 when mine=1 and no authenticated user is present", async () => {
    const { GET } = await import("@/app/api/events/route");
    const request = new Request("http://localhost:3000/api/events?mine=1");

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toContain("Authentication required");
  });

  it("filters by authenticated organizer when mine=1", async () => {
    const { GET } = await import("@/app/api/events/route");

    findFirstUser.mockResolvedValue({ id: "org_1", role: "ORGANIZER" });
    findMany.mockResolvedValue([]);

    const request = new Request("http://localhost:3000/api/events?mine=1", {
      headers: { "x-hackvillage-user-id": "org_1" },
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizerId: "org_1" }),
      }),
    );
  });

  it("rejects invalid mine query values", async () => {
    const { GET } = await import("@/app/api/events/route");
    const request = new Request("http://localhost:3000/api/events?mine=maybe");

    const response = await GET(request);

    expect(response.status).toBe(400);
  });

  it("creates a draft event for an authenticated organizer", async () => {
    const { POST } = await import("@/app/api/events/route");

    findFirstUser.mockResolvedValue({ id: "org_1", role: "ORGANIZER" });
    createEvent.mockResolvedValue(dbEvent());

    const response = await POST(
      new Request("http://localhost:3000/api/events", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-hackvillage-user-id": "org_1",
        },
        body: JSON.stringify({
          title: "  Event 1  ",
          problemStatement: "Solve a meaningful challenge for local communities.",
          prizePoolKes: 1200,
          startsAt: "2026-09-01T10:00:00.000Z",
          endsAt: "2026-09-01T18:00:00.000Z",
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.event.status).toBe("DRAFT");
    expect(createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizerId: "org_1",
          status: "DRAFT",
        }),
      }),
    );
  });

  it("rejects unauthenticated create requests", async () => {
    const { POST } = await import("@/app/api/events/route");

    const response = await POST(
      new Request("http://localhost:3000/api/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Event 1",
          problemStatement: "Solve a meaningful challenge for local communities.",
          prizePoolKes: 1200,
          startsAt: "2026-09-01T10:00:00.000Z",
          endsAt: "2026-09-01T18:00:00.000Z",
        }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("rejects create requests from non-organizers", async () => {
    const { POST } = await import("@/app/api/events/route");
    findFirstUser.mockResolvedValue({ id: "dev_1", role: "DEVELOPER" });

    const response = await POST(
      new Request("http://localhost:3000/api/events", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-hackvillage-user-id": "dev_1",
        },
        body: JSON.stringify({
          title: "Event 1",
          problemStatement: "Solve a meaningful challenge for local communities.",
          prizePoolKes: 1200,
          startsAt: "2026-09-01T10:00:00.000Z",
          endsAt: "2026-09-01T18:00:00.000Z",
        }),
      }),
    );

    expect(response.status).toBe(403);
  });

  it("returns field errors for invalid create payload", async () => {
    const { POST } = await import("@/app/api/events/route");
    findFirstUser.mockResolvedValue({ id: "org_1", role: "ORGANIZER" });

    const response = await POST(
      new Request("http://localhost:3000/api/events", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-hackvillage-user-id": "org_1",
        },
        body: JSON.stringify({
          title: "  ",
          problemStatement: "short",
          prizePoolKes: -10,
          startsAt: "2026-09-01T10:00:00.000Z",
          endsAt: "2026-08-01T10:00:00.000Z",
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(422);
    expect(body.message).toBe("Validation failed");
    expect(body.errors.title).toBeTruthy();
    expect(body.errors.problemStatement).toBeTruthy();
    expect(body.errors.prizePoolKes).toBeTruthy();
    expect(body.errors.endsAt).toBeTruthy();
  });
});
