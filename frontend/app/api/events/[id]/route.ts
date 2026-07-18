import { AuthError, getSession, hasRole, requireApiRole } from "@backend/lib/auth";
import {
  formatZodError,
  updateEventDraftSchema,
} from "@backend/lib/validations/event.schema";
import {
  getEventDetail,
  updateEventDraft,
} from "@backend/services/events/events.service";
import { getPublicEventBySlugOrId } from "@backend/services/events/public-events.service";
import { NextRequest, NextResponse } from "next/server";

function errorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.code === "UNAUTHORIZED" ? 401 : 403 },
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
        { error: { code: "FORBIDDEN", message: "You do not own this event" } },
        { status: 403 },
      );
    }
    if (error.message === "NOT_DRAFT") {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Can only update draft events" } },
        { status: 400 },
      );
    }
  }
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
    { status: 500 },
  );
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const publicEvent = await getPublicEventBySlugOrId(params.id);
    if (publicEvent) {
      return NextResponse.json(publicEvent);
    }

    const session = await getSession();
    if (!session || !hasRole(session, "ORGANIZER")) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Event not found" } },
        { status: 404 },
      );
    }

    const event = await getEventDetail(params.id);
    if (!event) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Event not found" } },
        { status: 404 },
      );
    }

    if (event.organizerId !== session.userId && session.role !== "ADMIN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You don't own this event" } },
        { status: 403 },
      );
    }

    return NextResponse.json(event);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireApiRole("ORGANIZER");
    const body = await req.json();

    const parsed = updateEventDraftSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(formatZodError(parsed.error), { status: 400 });
    }

    const event = await updateEventDraft(params.id, session.userId, parsed.data);
    return NextResponse.json(event);
  } catch (error) {
    return errorResponse(error);
  }
}
