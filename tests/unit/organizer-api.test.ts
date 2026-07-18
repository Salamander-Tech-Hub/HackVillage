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
});
