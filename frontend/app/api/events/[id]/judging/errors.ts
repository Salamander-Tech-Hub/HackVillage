import { AuthError } from "@backend/lib/auth";
import { LifecycleError } from "@backend/services/events/lifecycle";
import { NextResponse } from "next/server";

export function judgingErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.code === "UNAUTHORIZED" ? 401 : 403 },
    );
  }
  if (error instanceof LifecycleError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.code === "PRECONDITION_FAILED" ? 400 : 409 },
    );
  }
  if (error instanceof Error) {
    if (error.message === "NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Event not found" } },
        { status: 404 },
      );
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You don't own this event" } },
        { status: 403 },
      );
    }
    if (error.message === "INVALID_EMAIL") {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "A valid judge email is required" } },
        { status: 400 },
      );
    }
    if (error.message === "NOT_A_JUDGE") {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "That email belongs to an account that isn't a judge.",
          },
        },
        { status: 400 },
      );
    }
  }
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
    { status: 500 },
  );
}
