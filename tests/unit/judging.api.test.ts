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

vi.mock("@backend/services/judging/judging.service", () => ({
  upsertFeedback: vi.fn(),
  assignJudge: vi.fn(),
}));

import { requireApiRole } from "@backend/lib/auth";
import { JudgingError } from "@backend/services/judging/judging";
import * as judgingService from "@backend/services/judging/judging.service";
import { PUT } from "../../frontend/app/api/submissions/[submissionId]/feedback/route";
import { POST as POST_JUDGE } from "../../frontend/app/api/events/[id]/judges/route";

const judgeSession = {
  userId: "judge-1",
  email: "judge@hackvillage.local",
  name: "Demo Judge",
  role: "JUDGE" as const,
  issuedAt: 1,
  expiresAt: 999999,
};

const organizerSession = {
  ...judgeSession,
  userId: "org-1",
  role: "ORGANIZER" as const,
};

describe("Judge API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test("rejects feedback with fewer than three points", async () => {
    vi.mocked(requireApiRole).mockResolvedValue(judgeSession);
    const req = new NextRequest("http://localhost/api/submissions/sub-1/feedback", {
      method: "PUT",
      body: JSON.stringify({ points: ["Only one"] }),
    });
    const res = await PUT(req, { params: { submissionId: "sub-1" } });
    expect(res.status).toBe(400);
  });

  test("saves structured feedback", async () => {
    vi.mocked(requireApiRole).mockResolvedValue(judgeSession);
    vi.mocked(judgingService.upsertFeedback).mockResolvedValue({
      id: "fb-1",
      submissionId: "sub-1",
      judgeId: "judge-1",
      points: ["Clear demo", "Strong repo", "Next step"],
      score: 8,
      createdAt: "2026-09-26T00:00:00.000Z",
    });

    const req = new NextRequest("http://localhost/api/submissions/sub-1/feedback", {
      method: "PUT",
      body: JSON.stringify({
        points: ["Clear demo", "Strong repo", "Next step"],
        score: 8,
      }),
    });
    const res = await PUT(req, { params: { submissionId: "sub-1" } });
    expect(res.status).toBe(200);
    expect(judgingService.upsertFeedback).toHaveBeenCalledWith(
      "sub-1",
      "judge-1",
      "JUDGE",
      {
        points: ["Clear demo", "Strong repo", "Next step"],
        score: 8,
      },
    );
  });

  test("assign judge maps domain errors", async () => {
    vi.mocked(requireApiRole).mockResolvedValue(organizerSession);
    vi.mocked(judgingService.assignJudge).mockRejectedValue(
      new JudgingError("PRECONDITION_FAILED", "That account is not a judge."),
    );
    const req = new NextRequest("http://localhost/api/events/evt-1/judges", {
      method: "POST",
      body: JSON.stringify({ email: "attendee1@hackvillage.local" }),
    });
    const res = await POST_JUDGE(req, { params: { id: "evt-1" } });
    expect(res.status).toBe(400);
  });
});
