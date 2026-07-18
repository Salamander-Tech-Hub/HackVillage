import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalNodeEnv = process.env.NODE_ENV;
const originalMockFlag = process.env.NEXT_PUBLIC_ENABLE_MOCK_EVENTS;

describe("organizerApi", () => {
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

  it("submits create payload and returns created event", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          event: {
            id: "evt_123",
            title: "Event One",
            status: "DRAFT",
            prizePoolKes: 1000,
            submissionsCount: 0,
          },
        }),
      }),
    );

    const { createEvent } = await import("@/lib/organizerApi");
    const result = await createEvent({
      title: "Event One",
      problemStatement: "Build a useful platform for community impact.",
      prizePoolKes: 1000,
      startsAt: "2026-09-01T10:00:00.000Z",
      endsAt: "2026-09-01T18:00:00.000Z",
    });

    expect(result.id).toBe("evt_123");
  });

  it("maps server field errors for create/update responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({
          message: "Validation failed",
          errors: { title: "Title is required" },
          code: "VALIDATION_FAILED",
        }),
      }),
    );

    const { createEvent, OrganizerApiError } = await import("@/lib/organizerApi");

    await expect(
      createEvent({
        title: "",
        problemStatement: "Build a useful platform for community impact.",
        prizePoolKes: 1000,
        startsAt: "2026-09-01T10:00:00.000Z",
        endsAt: "2026-09-01T18:00:00.000Z",
      }),
    ).rejects.toMatchObject({
      status: 422,
      fieldErrors: { title: "Title is required" },
    });
  });
});
