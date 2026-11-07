import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@backend/lib/auth", () => ({
  AuthError: class AuthError extends Error {
    code: "UNAUTHORIZED" | "FORBIDDEN";
    constructor(code: "UNAUTHORIZED" | "FORBIDDEN", message: string) {
      super(message);
      this.code = code;
    }
  },
  requireApiRole: vi.fn(),
}));

vi.mock("@backend/services/events/lifecycle.service", () => ({
  transitionEvent: vi.fn(),
}));

import { AuthError, requireApiRole } from "@backend/lib/auth";
import { LifecycleError } from "@backend/services/events/lifecycle";
import * as lifecycleService from "@backend/services/events/lifecycle.service";
import { POST } from "../../frontend/app/api/events/[id]/transitions/route";

const organizerSession = {
  userId: "org-1",
  email: "organizer@hackvillage.local",
  name: "Demo Organizer",
  role: "ORGANIZER" as const,
  issuedAt: 1,
  expiresAt: 999999,
};

describe("POST /api/events/:id/transitions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test("unauthorized returns 401", async () => {
    vi.mocked(requireApiRole).mockRejectedValue(
      new AuthError("UNAUTHORIZED", "Sign in is required."),
    );

    const req = new NextRequest("http://localhost/api/events/evt-1/transitions", {
      method: "POST",
      body: JSON.stringify({ action: "START_ESCROW" }),
    });
    const res = await POST(req, { params: { id: "evt-1" } });
    expect(res.status).toBe(401);
  });

  test("rejects an unknown action", async () => {
    vi.mocked(requireApiRole).mockResolvedValue(organizerSession);
    const req = new NextRequest("http://localhost/api/events/evt-1/transitions", {
      method: "POST",
      body: JSON.stringify({ action: "SKIP_TO_LIVE" }),
    });
    const res = await POST(req, { params: { id: "evt-1" } });
    expect(res.status).toBe(400);
  });

  test("returns the updated event on a valid transition", async () => {
    vi.mocked(requireApiRole).mockResolvedValue(organizerSession);
    vi.mocked(lifecycleService.transitionEvent).mockResolvedValue({
      id: "evt-1",
      status: "PENDING_ESCROW",
    } as never);

    const req = new NextRequest("http://localhost/api/events/evt-1/transitions", {
      method: "POST",
      body: JSON.stringify({ action: "START_ESCROW" }),
    });
    const res = await POST(req, { params: { id: "evt-1" } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("PENDING_ESCROW");
    expect(lifecycleService.transitionEvent).toHaveBeenCalledWith({
      eventId: "evt-1",
      actorId: "org-1",
      actorRole: "ORGANIZER",
      action: "START_ESCROW",
    });
  });

  test("maps lifecycle precondition failures to 400", async () => {
    vi.mocked(requireApiRole).mockResolvedValue(organizerSession);
    vi.mocked(lifecycleService.transitionEvent).mockRejectedValue(
      new LifecycleError("PRECONDITION_FAILED", "Set a prize pool greater than zero before starting escrow."),
    );

    const req = new NextRequest("http://localhost/api/events/evt-1/transitions", {
      method: "POST",
      body: JSON.stringify({ action: "START_ESCROW" }),
    });
    const res = await POST(req, { params: { id: "evt-1" } });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error.code).toBe("PRECONDITION_FAILED");
  });
});
