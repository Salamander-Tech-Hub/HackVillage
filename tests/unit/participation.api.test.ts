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

vi.mock("@backend/services/participation/participation.service", () => ({
  registerForEvent: vi.fn(),
  getRegistration: vi.fn(),
  createTeam: vi.fn(),
  listEventTeams: vi.fn(),
}));

import { AuthError, requireApiRole } from "@backend/lib/auth";
import { ParticipationError } from "@backend/services/participation/participation";
import * as participationService from "@backend/services/participation/participation.service";
import { POST as POST_REGISTRATION } from "../../frontend/app/api/events/[id]/registration/route";
import { POST as POST_TEAM } from "../../frontend/app/api/events/[id]/teams/route";

const developerSession = {
  userId: "dev-1",
  email: "attendee1@hackvillage.local",
  name: "Demo Attendee One",
  role: "DEVELOPER" as const,
  issuedAt: 1,
  expiresAt: 999999,
};

describe("Developer participation API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test("register requires a developer session", async () => {
    vi.mocked(requireApiRole).mockRejectedValue(
      new AuthError("UNAUTHORIZED", "Sign in is required."),
    );
    const res = await POST_REGISTRATION(new Request("http://localhost/api/events/evt-1/registration"), {
      params: { id: "evt-1" },
    });
    expect(res.status).toBe(401);
  });

  test("register returns the created registration", async () => {
    vi.mocked(requireApiRole).mockResolvedValue(developerSession);
    vi.mocked(participationService.registerForEvent).mockResolvedValue({
      id: "reg-1",
      eventId: "evt-1",
      userId: "dev-1",
      createdAt: "2026-09-26T00:00:00.000Z",
    });

    const res = await POST_REGISTRATION(new Request("http://localhost/api/events/evt-1/registration"), {
      params: { id: "evt-1" },
    });
    expect(res.status).toBe(201);
    expect(participationService.registerForEvent).toHaveBeenCalledWith("evt-1", "dev-1");
  });

  test("create team rejects an empty name", async () => {
    vi.mocked(requireApiRole).mockResolvedValue(developerSession);
    const req = new NextRequest("http://localhost/api/events/evt-1/teams", {
      method: "POST",
      body: JSON.stringify({ name: "" }),
    });
    const res = await POST_TEAM(req, { params: { id: "evt-1" } });
    expect(res.status).toBe(400);
  });

  test("create team maps participation conflicts", async () => {
    vi.mocked(requireApiRole).mockResolvedValue(developerSession);
    vi.mocked(participationService.createTeam).mockRejectedValue(
      new ParticipationError("CONFLICT", "You already belong to a team for this event."),
    );
    const req = new NextRequest("http://localhost/api/events/evt-1/teams", {
      method: "POST",
      body: JSON.stringify({ name: "Climate Crew" }),
    });
    const res = await POST_TEAM(req, { params: { id: "evt-1" } });
    expect(res.status).toBe(409);
  });
});
