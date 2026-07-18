import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@backend/lib/auth";
import { eventDraftSchema, formatZodError } from "@backend/lib/validations/event.schema";
import { createDraftEvent, getOrganizerEvents } from "@backend/services/events/events.service";

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, "ORGANIZER");
    const body = await req.json();
    
    const parsed = eventDraftSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(formatZodError(parsed.error), { status: 400 });
    }

    const event = await createDraftEvent(user.id, parsed.data);
    return NextResponse.json(event, { status: 201 });
  } catch (error: any) {
    if (error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: error.message } }, { status: 401 });
    }
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(req, "ORGANIZER");
    const url = new URL(req.url);
    const mine = url.searchParams.get("mine");

    if (mine !== "1") {
      return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Only ?mine=1 is supported for this endpoint" } }, { status: 400 });
    }

    const events = await getOrganizerEvents(user.id);
    return NextResponse.json(events);
  } catch (error: any) {
    if (error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: error.message } }, { status: 401 });
    }
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } }, { status: 500 });
  }
}
