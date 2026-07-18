import { NextResponse } from "next/server";
import type {
  ApiValidationErrorResponse,
  DraftEventInput,
  EventsListResponse,
  OrganizerEvent,
} from "@/lib/types";
import { parseCreateDraftInput } from "@/lib/eventDraftSchema";
import {
  buildUniqueSlug,
  getPrismaOrThrow,
  jsonError,
  mapDbEventToOrganizerEvent,
  parseMineFlag,
  parseStatusFilter,
  requireOrganizerAuth,
} from "./_shared";

// Force dynamic — this route reads from the DB and should not be cached.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/events
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mineRaw = searchParams.get("mine");
  const mine = parseMineFlag(mineRaw);
  if (mineRaw !== null && mine === null) {
    return jsonError("Invalid mine query value. Use mine=1 or mine=true.", 400, "BAD_QUERY");
  }

  const organizerId = searchParams.get("organizerId");
  const statusParam = searchParams.get("status");
  const statusFilter = parseStatusFilter(statusParam);

  try {
    let authUserId: string | null = null;
    if (mine) {
      const authResult = await requireOrganizerAuth(request);
      if (!authResult.ok) return authResult.response;
      authUserId = authResult.user.id;
    }

    const events = await loadFromDatabase({
      organizerId,
      statusFilter,
      mine: Boolean(mine),
      authUserId,
    });

    const response: EventsListResponse = {
      events,
      source: "database",
      count: events.length,
    };
    return NextResponse.json(response);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to list events.",
      500,
      "EVENTS_LIST_FAILED",
    );
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireOrganizerAuth(request);
    if (!authResult.ok) return authResult.response;

    const payload = (await request.json()) as unknown;
    const parsed = parseCreateDraftInput(payload);
    if (!parsed.ok) {
      return NextResponse.json(
        {
          message: "Validation failed",
          errors: parsed.errors,
          code: "VALIDATION_FAILED",
        } satisfies ApiValidationErrorResponse,
        { status: 422 },
      );
    }

    const data = parsed.data;
    const prisma = await getPrismaOrThrow();
    const slug = await buildUniqueSlug(data.title);

    const created = await prisma.event.create({
      data: {
        slug,
        title: data.title,
        problemStatement: data.problemStatement,
        prizePoolKes: data.prizePoolKes,
        startsAt: new Date(data.startsAt),
        endsAt: new Date(data.endsAt),
        status: "DRAFT",
        organizerId: authResult.user.id,
      },
      include: {
        escrowVault: true,
        _count: { select: { submissions: true } },
      },
    });

    const event = mapDbEventToOrganizerEvent(created);
    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to create event.",
      500,
      "EVENT_CREATE_FAILED",
    );
  }
}

async function loadFromDatabase(opts: {
  organizerId: string | null;
  statusFilter: import("@prisma/client").EventStatus[] | null;
  mine: boolean;
  authUserId: string | null;
}): Promise<OrganizerEvent[]> {
  const prisma = await getPrismaOrThrow();

  const rows = await prisma.event.findMany({
    where: {
      ...(opts.mine && opts.authUserId ? { organizerId: opts.authUserId } : {}),
      ...(!opts.mine && opts.organizerId ? { organizerId: opts.organizerId } : {}),
      ...(opts.statusFilter && opts.statusFilter.length > 0
        ? { status: { in: opts.statusFilter } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      escrowVault: true,
      _count: { select: { submissions: true } },
    },
  });

  return rows.map((row) => mapDbEventToOrganizerEvent(row));
}
