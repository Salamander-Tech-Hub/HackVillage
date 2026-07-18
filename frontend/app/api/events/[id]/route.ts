import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@backend/lib/auth";
import { updateEventDraftSchema, formatZodError } from "@backend/lib/validations/event.schema";
import { getEventDetail, updateEventDraft } from "@backend/services/events/events.service";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole(req, "ORGANIZER");
    const event = await getEventDetail(params.id);

    if (!event) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Event not found" } }, { status: 404 });
    }

    if (event.organizerId !== user.id) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "You don't own this event" } }, { status: 403 });
    }

    return NextResponse.json(event);
  } catch (error: any) {
    if (error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: error.message } }, { status: 401 });
    }
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole(req, "ORGANIZER");
    const body = await req.json();

    const parsed = updateEventDraftSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(formatZodError(parsed.error), { status: 400 });
    }

    const event = await updateEventDraft(params.id, user.id, parsed.data);
    return NextResponse.json(event);
  } catch (error: any) {
    if (error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: error.message } }, { status: 401 });
    }
    if (error.message === "NOT_FOUND") {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Event not found" } }, { status: 404 });
    }
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "You do not own this event" } }, { status: 403 });
    }
    if (error.message === "NOT_DRAFT") {
      return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Can only update draft events" } }, { status: 400 });
    }
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } }, { status: 500 });
  }
}
