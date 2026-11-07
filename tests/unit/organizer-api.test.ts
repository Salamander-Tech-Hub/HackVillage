import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalNodeEnv = process.env.NODE_ENV;
const originalMockFlag = process.env.NEXT_PUBLIC_ENABLE_MOCK_EVENTS;

describe("organizerApi", { timeout: 15_000 }, () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.stubEnv("NODE_ENV", originalNodeEnv ?? "test");
    vi.stubEnv("NEXT_PUBLIC_ENABLE_MOCK_EVENTS", originalMockFlag ?? "");
  });

  it("returns normalized events from array payloads", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_ENABLE_MOCK_EVENTS", "false");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            id: "evt_1",
            title: "Event One",
            status: "LIVE",
            prizePoolKes: 1000,
            submissionsCount: 3,
          },
        ],
      }),
    );

    const { getMyEvents } = await import("@/lib/organizerApi");
    const response = await getMyEvents();

    expect(response.events).toHaveLength(1);
    expect(response.events[0].title).toBe("Event One");
  });

  it("returns normalized events from the organizer list envelope", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_ENABLE_MOCK_EVENTS", "false");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          source: "database",
          count: 1,
          events: [
            {
              id: "evt_1",
              title: "Climate Sprint",
              problemStatement: "Track emissions.",
              status: "PRIZE_VERIFIED",
              prizePoolKes: 500000,
              location: "Nairobi Garage",
              format: "IN_PERSON",
              registrationsCount: 5,
              submissionsCount: 12,
              escrow: {
                state: "PRIZE_VAULT",
                amountKes: 500000,
                publicLedgerUrl: "https://amoy.polygonscan.com/tx/0xseedlock",
              },
            },
          ],
        }),
      }),
    );

    const { getMyEvents } = await import("@/lib/organizerApi");
    const response = await getMyEvents();

    expect(response.source).toBe("database");
    expect(response.count).toBe(1);
    expect(response.events[0]).toMatchObject({
      title: "Climate Sprint",
      location: "Nairobi Garage",
      format: "IN_PERSON",
      registrationsCount: 5,
      submissionsCount: 12,
      escrow: {
        state: "PRIZE_VAULT",
        amountKes: 500000,
      },
    });
  });

  it("uses typed mock fallback only when enabled in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_ENABLE_MOCK_EVENTS", "true");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );

    const { getMyEvents } = await import("@/lib/organizerApi");
    const response = await getMyEvents();

    expect(response.source).toBe("mock");
    expect(response.events.length).toBeGreaterThan(0);
  });

  it("does not fallback for authentication errors", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_ENABLE_MOCK_EVENTS", "true");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: "Authentication required" }),
      }),
    );

    const { getMyEvents, OrganizerApiError } = await import("@/lib/organizerApi");

    await expect(getMyEvents()).rejects.toBeInstanceOf(OrganizerApiError);
  });

  it("posts draft payloads using the backend field names", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "evt_created",
        title: "New Event",
        status: "DRAFT",
        prizePoolKes: 1000,
        submissionsCount: 0,
        allowedActions: ["START_ESCROW"],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { createEvent } = await import("@/lib/organizerApi");
    const created = await createEvent({
      title: "New Event",
      problemStatement: "Solve something",
      prizePoolKes: 1000,
      startsAt: null,
      endsAt: null,
      location: "Nairobi",
      format: "HYBRID",
    });

    expect(created.id).toBe("evt_created");
    expect(created.allowedActions).toEqual(["START_ESCROW"]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/events",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          title: "New Event",
          problem_statement: "Solve something",
          prize_total: 1000,
          location: "Nairobi",
          format: "HYBRID",
        }),
      }),
    );
  });

  it("loads teams and submissions for the participants panel", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          teams: [
            {
              id: "team-1",
              eventId: "evt-1",
              name: "Rootline",
              members: [{ userId: "u1", name: "Ada", email: "ada@hackvillage.local" }],
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          submissions: [
            {
              id: "sub-1",
              eventId: "evt-1",
              teamId: "team-1",
              teamName: "Rootline",
              title: "SoilSense",
              repoUrl: "https://github.com/rootline/soilsense",
              isWinner: true,
            },
          ],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const { getEventTeams, getEventSubmissions } = await import("@/lib/organizerApi");
    const teams = await getEventTeams("evt-1");
    const submissions = await getEventSubmissions("evt-1");

    expect(teams[0].name).toBe("Rootline");
    expect(submissions[0]).toMatchObject({
      title: "SoilSense",
      isWinner: true,
      teamName: "Rootline",
    });
  });

  it("posts selected winner ids instead of a typed submission id", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        winners: [{ id: "sub-1", title: "SoilSense", teamId: "team-1" }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { declareWinners } = await import("@/lib/organizerApi");
    const winners = await declareWinners("evt-1", ["sub-1", "sub-2"]);

    expect(winners).toEqual([{ id: "sub-1", title: "SoilSense", teamId: "team-1" }]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/events/evt-1/winners",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ submissionIds: ["sub-1", "sub-2"] }),
      }),
    );
  });
});
