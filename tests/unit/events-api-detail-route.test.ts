import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirstEvent = vi.fn();
const findFirstUser = vi.fn();

vi.mock("@backend/lib/db", () => ({
  prisma: {
    event: { findFirst: findFirstEvent },
    user: { findFirst: findFirstUser },
  },
}));

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
});
