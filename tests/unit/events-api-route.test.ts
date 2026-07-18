import { beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();
const findFirstUser = vi.fn();

vi.mock("@backend/lib/db", () => ({
  prisma: {
    event: { findMany },
    user: { findFirst: findFirstUser },
  },
}));

describe("GET /api/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "postgresql://demo";
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
});
