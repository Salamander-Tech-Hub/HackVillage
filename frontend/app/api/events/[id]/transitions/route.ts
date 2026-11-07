import { AuthError, requireApiRole } from "@backend/lib/auth";
import {
  eventTransitionSchema,
  formatZodError,
} from "@backend/lib/validations/event.schema";
import { listEventTransitions, transitionEvent } from "@backend/services/events/lifecycle.service";
import { LifecycleError } from "@backend/services/events/lifecycle";
import { NextRequest, NextResponse } from "next/server";

function errorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.code === "UNAUTHORIZED" ? 401 : 403 },
    );
  }
  if (error instanceof LifecycleError) {
    const status =
      error.code === "NOT_FOUND"
        ? 404
        : error.code === "FORBIDDEN"
          ? 403
          : error.code === "INVALID_TRANSITION"
            ? 409
            : 400;
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status },
    );
  }
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
    { status: 500 },
  );
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireApiRole("ORGANIZER");
    const transitions = await listEventTransitions(params.id, session.userId, session.role);
    return NextResponse.json({ transitions });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireApiRole("ORGANIZER");
    const body = await req.json();
    const parsed = eventTransitionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(formatZodError(parsed.error), { status: 400 });
    }

    const event = await transitionEvent({
      eventId: params.id,
      actorId: session.userId,
      actorRole: session.role,
      action: parsed.data.action,
    });

    return NextResponse.json(event);
  } catch (error) {
    return errorResponse(error);
  }
}
