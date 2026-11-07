import { describe, expect, it } from "vitest";
import {
  assertFeedbackPoints,
  judgingProgress,
  judgingReadiness,
  JudgingError,
} from "@backend/services/judging/judging";

describe("judging rules", () => {
  it("requires at least three non-empty feedback points", () => {
    expect(assertFeedbackPoints(["Clear demo", "Strong repo", "Next step"])).toHaveLength(3);
    expect(() => assertFeedbackPoints(["One", "Two", "  "])).toThrow(JudgingError);
  });

  it("is complete when there are no submissions", () => {
    const result = judgingReadiness({
      submissionIds: [],
      assignedJudgeIds: ["judge-1"],
      reviews: [],
    });
    expect(result.complete).toBe(true);
  });

  it("blocks close when a submission is missing a judge review", () => {
    const result = judgingReadiness({
      submissionIds: ["sub-1", "sub-2"],
      assignedJudgeIds: ["judge-1"],
      reviews: [{ submissionId: "sub-1", judgeId: "judge-1", points: ["a", "b", "c"] }],
    });
    expect(result.complete).toBe(false);
    expect(result.missing).toEqual([{ submissionId: "sub-2", judgeId: "judge-1" }]);
  });

  it("is complete when every judge reviewed every submission", () => {
    const result = judgingReadiness({
      submissionIds: ["sub-1"],
      assignedJudgeIds: ["judge-1"],
      reviews: [{ submissionId: "sub-1", judgeId: "judge-1", points: ["a", "b", "c"] }],
    });
    expect(result.complete).toBe(true);
  });
});

describe("judging progress", () => {
  const submissions = [
    { id: "sub-1", title: "Alpha", teamName: "Team A" },
    { id: "sub-2", title: "Beta", teamName: "Team B" },
  ];
  const judges = [{ id: "judge-1", name: "Ada", email: "ada@hackvillage.local" }];

  it("ignores reviews that have fewer than three feedback points", () => {
    const result = judgingProgress({
      submissions,
      judges,
      reviews: [{ submissionId: "sub-1", judgeId: "judge-1", points: ["only one"] }],
    });
    expect(result.isReadyToClose).toBe(false);
    expect(result.judges[0]).toMatchObject({ reviewed: 0, pending: 2, isComplete: false });
    expect(result.missingReason).toMatch(/three feedback points/);
  });

  it("counts a review only after three feedback points", () => {
    const result = judgingProgress({
      submissions: [submissions[0]],
      judges,
      reviews: [{ submissionId: "sub-1", judgeId: "judge-1", points: ["a", "b", "c"] }],
    });
    expect(result.isReadyToClose).toBe(true);
    expect(result.missingReason).toBeNull();
    expect(result.percentage).toBe(100);
    expect(result.submissions[0].isComplete).toBe(true);
  });

  it("is ready to close when the event has no submissions", () => {
    const result = judgingProgress({
      submissions: [],
      judges,
      reviews: [],
    });
    expect(result.isReadyToClose).toBe(true);
    expect(result.percentage).toBe(100);
  });
});
