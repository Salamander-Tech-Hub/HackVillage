export const MIN_FEEDBACK_POINTS = 3;
export const FEEDBACK_STATUSES = ["LIVE", "JUDGING"] as const;

export class JudgingError extends Error {
  code: "NOT_FOUND" | "FORBIDDEN" | "PRECONDITION_FAILED" | "CONFLICT";

  constructor(code: JudgingError["code"], message: string) {
    super(message);
    this.name = "JudgingError";
    this.code = code;
  }
}

export type JudgingReview = {
  submissionId: string;
  judgeId: string;
  points: string[];
};

export type JudgingReadinessInput = {
  submissionIds: string[];
  assignedJudgeIds: string[];
  reviews: JudgingReview[];
};

export type JudgingReadiness = {
  complete: boolean;
  reason: string;
  missing: { submissionId: string; judgeId: string }[];
};

export function usableFeedbackPoints(points: string[]): string[] {
  return points.map((point) => point.trim()).filter((point) => point.length > 0);
}

export function assertFeedbackPoints(points: string[]): string[] {
  const usable = usableFeedbackPoints(points);
  if (usable.length < MIN_FEEDBACK_POINTS) {
    throw new JudgingError(
      "PRECONDITION_FAILED",
      `Judges must submit at least ${MIN_FEEDBACK_POINTS} structured feedback points.`,
    );
  }
  return usable;
}

export function assertCanWriteFeedback(status: string): void {
  if (!FEEDBACK_STATUSES.includes(status as (typeof FEEDBACK_STATUSES)[number])) {
    throw new JudgingError(
      "PRECONDITION_FAILED",
      "Feedback can only be submitted while the event is live or in judging.",
    );
  }
}

export function judgingReadiness(input: JudgingReadinessInput): JudgingReadiness {
  if (input.submissionIds.length === 0) {
    return {
      complete: true,
      reason: "No submissions to review.",
      missing: [],
    };
  }

  if (input.assignedJudgeIds.length === 0) {
    return {
      complete: false,
      reason: "Assign at least one judge before closing an event with submissions.",
      missing: [],
    };
  }

  const reviewKey = new Set(
    input.reviews
      .filter((review) => usableFeedbackPoints(review.points).length >= MIN_FEEDBACK_POINTS)
      .map((review) => `${review.submissionId}:${review.judgeId}`),
  );

  const missing: { submissionId: string; judgeId: string }[] = [];
  for (const submissionId of input.submissionIds) {
    for (const judgeId of input.assignedJudgeIds) {
      if (!reviewKey.has(`${submissionId}:${judgeId}`)) {
        missing.push({ submissionId, judgeId });
      }
    }
  }

  return {
    complete: missing.length === 0,
    reason:
      missing.length === 0
        ? "All assigned judges have submitted structured feedback."
        : "Every assigned judge must review every submission with at least three feedback points.",
    missing,
  };
}

export type JudgingProgressJudge = {
  judgeId: string;
  name: string;
  email: string;
  reviewed: number;
  total: number;
  pending: number;
  isComplete: boolean;
};

export type JudgingProgressSubmission = {
  submissionId: string;
  title: string;
  teamName: string;
  reviewed: number;
  total: number;
  isComplete: boolean;
};

export type JudgingProgress = {
  totalSubmissions: number;
  totalJudges: number;
  totalReviewsRequired: number;
  totalReviewsCompleted: number;
  percentage: number;
  isReadyToClose: boolean;
  missingReason: string | null;
  judges: JudgingProgressJudge[];
  submissions: JudgingProgressSubmission[];
};

function qualifyingReviewKey(review: JudgingReview): string | null {
  if (usableFeedbackPoints(review.points).length < MIN_FEEDBACK_POINTS) return null;
  return `${review.submissionId}:${review.judgeId}`;
}

/** Per-judge and per-submission counts. A review counts only with three feedback points. */
export function judgingProgress(input: {
  submissions: { id: string; title: string; teamName: string }[];
  judges: { id: string; name: string; email: string }[];
  reviews: JudgingReview[];
}): JudgingProgress {
  const readiness = judgingReadiness({
    submissionIds: input.submissions.map((submission) => submission.id),
    assignedJudgeIds: input.judges.map((judge) => judge.id),
    reviews: input.reviews,
  });

  const qualifying = new Set(
    input.reviews
      .map(qualifyingReviewKey)
      .filter((key): key is string => key !== null),
  );

  const judges: JudgingProgressJudge[] = input.judges.map((judge) => {
    const reviewed = input.submissions.filter((submission) =>
      qualifying.has(`${submission.id}:${judge.id}`),
    ).length;
    const pending = Math.max(0, input.submissions.length - reviewed);
    const name = judge.name.trim() || judge.email.split("@")[0] || "Judge";
    return {
      judgeId: judge.id,
      name,
      email: judge.email,
      reviewed,
      total: input.submissions.length,
      pending,
      isComplete: pending === 0,
    };
  });

  const submissions: JudgingProgressSubmission[] = input.submissions.map((submission) => {
    const reviewed = input.judges.filter((judge) =>
      qualifying.has(`${submission.id}:${judge.id}`),
    ).length;
    return {
      submissionId: submission.id,
      title: submission.title,
      teamName: submission.teamName,
      reviewed,
      total: input.judges.length,
      isComplete: input.judges.length > 0 && reviewed >= input.judges.length,
    };
  });

  const totalReviewsRequired = input.judges.length * input.submissions.length;
  const totalReviewsCompleted = judges.reduce((sum, judge) => sum + judge.reviewed, 0);
  const percentage =
    totalReviewsRequired > 0
      ? Math.round((totalReviewsCompleted / totalReviewsRequired) * 100)
      : readiness.complete
        ? 100
        : 0;

  return {
    totalSubmissions: input.submissions.length,
    totalJudges: input.judges.length,
    totalReviewsRequired,
    totalReviewsCompleted,
    percentage,
    isReadyToClose: readiness.complete,
    missingReason: readiness.complete ? null : readiness.reason,
    judges,
    submissions,
  };
}
