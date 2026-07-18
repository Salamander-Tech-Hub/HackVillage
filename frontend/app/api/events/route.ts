import { AuthError, requireApiRole } from "@backend/lib/auth";
import { eventDraftSchema, formatZodError } from "@backend/lib/validations/event.schema";
import {
  createDraftEvent,
  getOrganizerEvents,
} from "@backend/services/events/events.service";
import { NextRequest, NextResponse } from "next/server";

function errorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.code === "UNAUTHORIZED" ? 401 : 403 },
    );
  }
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
    { status: 500 },
  );
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireApiRole("ORGANIZER");
    const body = await req.json();

    const parsed = eventDraftSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(formatZodError(parsed.error), { status: 400 });
    }

    const event = await createDraftEvent(session.userId, parsed.data);
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireApiRole("ORGANIZER");
    const mine = new URL(req.url).searchParams.get("mine");

    if (mine !== "1") {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "Only ?mine=1 is supported for this endpoint",
          },
        },
        { status: 400 },
      );
    }

    const events = await getOrganizerEvents(session.userId);
    return NextResponse.json(events);
  } catch (error) {
    return errorResponse(error);
  }
}
