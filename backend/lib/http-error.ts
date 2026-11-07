import { AuthError } from "@backend/lib/auth";
import { JudgingError } from "@backend/services/judging/judging";
import { LifecycleError } from "@backend/services/events/lifecycle";
import { MoneyError } from "@backend/services/money/money";
import { ParticipationError } from "@backend/services/participation/participation";
import { NextResponse } from "next/server";

function statusForCode(code: string): number {
  if (code === "UNAUTHORIZED") return 401;
  if (code === "FORBIDDEN") return 403;
  if (code === "NOT_FOUND") return 404;
  if (code === "CONFLICT" || code === "INVALID_TRANSITION") return 409;
  return 400;
}

export function jsonError(error: unknown): NextResponse {
  if (
    error instanceof AuthError ||
    error instanceof LifecycleError ||
    error instanceof ParticipationError ||
    error instanceof JudgingError ||
    error instanceof MoneyError
  ) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: statusForCode(error.code) },
    );
  }

  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
    { status: 500 },
  );
}
