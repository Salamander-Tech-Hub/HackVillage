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
  getSession: vi.fn(),
  hasRole: vi.fn(),
}));

vi.mock("@backend/services/events/judging.service", () => ({
  getJudgingReadinessForEvent: vi.fn(),
  assignJudgeToEvent: vi.fn(),
  removeJudgeFromEvent: vi.fn(),
  closeEvent: vi.fn(),
}));

import { AuthError, requireApiRole } from "@backend/lib/auth";
import * as judgingService from "@backend/services/events/judging.service";
import { LifecycleError } from "@backend/services/events/lifecycle";
import {
  DELETE,
  GET,
  POST,
} from "@/app/api/events/[id]/judging/route";
import { POST as closePOST } from "@/app/api/events/[id]/close/route";

describe("GET /api/events/[id]/judging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("rejects unauthenticated requests", async () => {
    vi.mocked(requireApiRole).mockRejectedValueOnce(
      new AuthError("UNAUTHORIZED", "Not signed in"),
    );

    const req = new NextRequest("http://localhost/api/events/evt_1/judging");
    const res = await GET(req, { params: { id: "evt_1" } });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  test("returns judging readiness for an organizer", async () => {
    vi.mocked(requireApiRole).mockResolvedValueOnce({
      userId: "org_1",
      email: "org@example.com",
      role: "ORGANIZER",
      name: null,
      issuedAt: 0,
      expiresAt: 0
    });

    vi.mocked(judgingService.getJudgingReadinessForEvent).mockResolvedValueOnce(
      {
        eventId: "evt_1",
        status: "JUDGING",
        totalSubmissions: 10,
        totalJudges: 2,
        totalReviewsRequired: 20,
        totalReviewsCompleted: 15,
        percentage: 75,
        isReadyToClose: false,
        missingReason: "Judge B has 5 pending reviews.",
        judges: [
          {
            judgeId: "j1",
            name: "Judge A",
            email: "a@test.com",
            reviewed: 10,
            total: 10,
            pending: 0,
            isComplete: true,
          },
          {
            judgeId: "j2",
            name: "Judge B",
            email: "b@test.com",
            reviewed: 5,
            total: 10,
            pending: 5,
            isComplete: false,
          },
        ],
      } as any,
    );

    const req = new NextRequest("http://localhost/api/events/evt_1/judging");
    const res = await GET(req, { params: { id: "evt_1" } });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalReviewsRequired).toBe(20);
    expect(body.totalReviewsCompleted).toBe(15);
    expect(body.percentage).toBe(75);
    expect(body.isReadyToClose).toBe(false);
    expect(body.missingReason).toBe("Judge B has 5 pending reviews.");
    expect(body.judges).toHaveLength(2);
    expect(judgingService.getJudgingReadinessForEvent).toHaveBeenCalledWith("evt_1", {
      organizerId: "org_1",
    });
  });

  test("lets admins read any event's judging progress", async () => {
    vi.mocked(requireApiRole).mockResolvedValueOnce({
      userId: "admin_1",
      email: "admin@example.com",
      role: "ADMIN",
      name: null,
      issuedAt: 0,
      expiresAt: 0,
    });
    vi.mocked(judgingService.getJudgingReadinessForEvent).mockResolvedValueOnce(
      { eventId: "evt_1" } as any,
    );

    const req = new NextRequest("http://localhost/api/events/evt_1/judging");
    await GET(req, { params: { id: "evt_1" } });

    expect(judgingService.getJudgingReadinessForEvent).toHaveBeenCalledWith("evt_1", {
      organizerId: undefined,
    });
  });

  test("returns 403 for another organizer's event instead of mock data", async () => {
    vi.mocked(requireApiRole).mockResolvedValueOnce({
      userId: "org_2",
      email: "other@example.com",
      role: "ORGANIZER",
      name: null,
      issuedAt: 0,
      expiresAt: 0,
    });
    vi.mocked(judgingService.getJudgingReadinessForEvent).mockRejectedValueOnce(
      new Error("FORBIDDEN"),
    );

    const req = new NextRequest("http://localhost/api/events/evt_1/judging");
    const res = await GET(req, { params: { id: "evt_1" } });

    expect(res.status).toBe(403);
  });
});

describe("POST /api/events/[id]/judging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("assigns a judge successfully", async () => {
    vi.mocked(requireApiRole).mockResolvedValueOnce({
      userId: "org_1",
      email: "org@example.com",
      role: "ORGANIZER",
      name: null,
      issuedAt: 0,
      expiresAt: 0
    });

    vi.mocked(judgingService.assignJudgeToEvent).mockResolvedValueOnce({
      eventId: "evt_1",
      totalJudges: 1,
    } as any);

    const req = new NextRequest("http://localhost/api/events/evt_1/judging", {
      method: "POST",
      body: JSON.stringify({ email: "judge@test.com", name: "Judge Test" }),
    });

    const res = await POST(req, { params: { id: "evt_1" } });
    expect(res.status).toBe(201);
    expect(judgingService.assignJudgeToEvent).toHaveBeenCalledWith(
      "evt_1",
      "org_1",
      { email: "judge@test.com", name: "Judge Test" },
    );
  });

  test("rejects assignment without email", async () => {
    vi.mocked(requireApiRole).mockResolvedValueOnce({
      userId: "org_1",
      email: "org@example.com",
      role: "ORGANIZER",
      name: null,
      issuedAt: 0,
      expiresAt: 0
    });

    const req = new NextRequest("http://localhost/api/events/evt_1/judging", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await POST(req, { params: { id: "evt_1" } });
    expect(res.status).toBe(400);
  });

  test("explains when the email belongs to a non-judge account", async () => {
    vi.mocked(requireApiRole).mockResolvedValueOnce({
      userId: "org_1",
      email: "org@example.com",
      role: "ORGANIZER",
      name: null,
      issuedAt: 0,
      expiresAt: 0,
    });
    vi.mocked(judgingService.assignJudgeToEvent).mockRejectedValueOnce(
      new Error("NOT_A_JUDGE"),
    );

    const req = new NextRequest("http://localhost/api/events/evt_1/judging", {
      method: "POST",
      body: JSON.stringify({ email: "org@example.com" }),
    });

    const res = await POST(req, { params: { id: "evt_1" } });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message).toMatch(/isn't a judge/);
  });
});

describe("DELETE /api/events/[id]/judging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("removes a judge before judging starts", async () => {
    vi.mocked(requireApiRole).mockResolvedValueOnce({
      userId: "org_1",
      email: "org@example.com",
      role: "ORGANIZER",
      name: null,
      issuedAt: 0,
      expiresAt: 0
    });

    vi.mocked(judgingService.removeJudgeFromEvent).mockResolvedValueOnce({
      eventId: "evt_1",
      totalJudges: 0,
    } as any);

    const req = new NextRequest(
      "http://localhost/api/events/evt_1/judging?judgeId=j1",
      {
        method: "DELETE",
      },
    );

    const res = await DELETE(req, { params: { id: "evt_1" } });
    expect(res.status).toBe(200);
    expect(judgingService.removeJudgeFromEvent).toHaveBeenCalledWith(
      "evt_1",
      "org_1",
      "j1",
    );
  });

  test("blocks removing a judge when judging has started", async () => {
    vi.mocked(requireApiRole).mockResolvedValueOnce({
      userId: "org_1",
      email: "org@example.com",
      role: "ORGANIZER",
      name: null,
      issuedAt: 0,
      expiresAt: 0
    });

    vi.mocked(judgingService.removeJudgeFromEvent).mockRejectedValueOnce(
      new LifecycleError(
        "PRECONDITION_FAILED",
        "Cannot remove a judge after judging has started.",
      ),
    );

    const req = new NextRequest(
      "http://localhost/api/events/evt_1/judging?judgeId=j1",
      {
        method: "DELETE",
      },
    );

    const res = await DELETE(req, { params: { id: "evt_1" } });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message).toBe(
      "Cannot remove a judge after judging has started.",
    );
  });
});

describe("POST /api/events/[id]/close", () => {
  test("calls closeEvent and returns 200 on success", async () => {
    vi.mocked(requireApiRole).mockResolvedValueOnce({
      userId: "org_1",
      email: "org@example.com",
      role: "ORGANIZER",
      name: null,
      issuedAt: 0,
      expiresAt: 0
    });

    vi.mocked(judgingService.closeEvent).mockResolvedValueOnce({
      eventId: "evt_1",
      status: "CLOSED",
      isReadyToClose: true,
    } as any);

    const req = new NextRequest("http://localhost/api/events/evt_1/close", {
      method: "POST",
    });

    const res = await closePOST(req, { params: { id: "evt_1" } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("CLOSED");
    expect(judgingService.closeEvent).toHaveBeenCalledWith("evt_1", "org_1");
  });

  test("returns 400 with the missing-review explanation when blocked", async () => {
    vi.mocked(requireApiRole).mockResolvedValueOnce({
      userId: "org_1",
      email: "org@example.com",
      role: "ORGANIZER",
      name: null,
      issuedAt: 0,
      expiresAt: 0,
    });
    vi.mocked(judgingService.closeEvent).mockRejectedValueOnce(
      new LifecycleError("PRECONDITION_FAILED", "Judge Amina B. has 5 pending reviews."),
    );

    const req = new NextRequest("http://localhost/api/events/evt_1/close", {
      method: "POST",
    });

    const res = await closePOST(req, { params: { id: "evt_1" } });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message).toBe("Judge Amina B. has 5 pending reviews.");
  });
});
