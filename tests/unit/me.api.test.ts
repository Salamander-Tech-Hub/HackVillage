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

vi.mock("@backend/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    developerProfile: {
      upsert: vi.fn(),
    },
  },
}));

import { AuthError, requireApiRole } from "@backend/lib/auth";
import { prisma } from "@backend/lib/db";
import { GET as GET_PROFILE } from "../../frontend/app/api/me/profile/route";
import { GET, PATCH } from "../../frontend/app/api/me/route";

const developerSession = {
  userId: "dev-1",
  email: "attendee1@hackvillage.local",
  name: "Demo Attendee One",
  role: "DEVELOPER" as const,
  issuedAt: 1,
  expiresAt: 999999,
};

describe("Me API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test("GET /api/me unauthorized", async () => {
    vi.mocked(requireApiRole).mockRejectedValue(
      new AuthError("UNAUTHORIZED", "Sign in is required."),
    );
    const res = await GET();
    expect(res.status).toBe(401);
  });

  test("GET /api/me happy path", async () => {
    vi.mocked(requireApiRole).mockResolvedValue(developerSession);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "dev-1",
      email: "attendee1@hackvillage.local",
      name: "Demo Attendee One",
      role: "DEVELOPER",
      githubHandle: "demo-attendee-one",
    } as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.githubHandle).toBe("demo-attendee-one");
  });

  test("PATCH /api/me validates github handle", async () => {
    vi.mocked(requireApiRole).mockResolvedValue(developerSession);
    const req = new NextRequest("http://localhost/api/me", {
      method: "PATCH",
      body: JSON.stringify({ github_handle: "" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  test("GET /api/me/profile upserts profile", async () => {
    vi.mocked(requireApiRole).mockResolvedValue(developerSession);
    vi.mocked(prisma.developerProfile.upsert).mockResolvedValue({
      userId: "dev-1",
      winCount: 0,
      eventCount: 0,
    } as never);

    const res = await GET_PROFILE();
    expect(res.status).toBe(200);
    expect(prisma.developerProfile.upsert).toHaveBeenCalled();
  });
});
