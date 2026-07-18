import { NextResponse } from "next/server";
import type { ApiValidationErrorResponse, OrganizerEvent } from "@/lib/types";
import {
  parsePatchDraftInput,
  validateMergedSchedule,
} from "@/lib/eventDraftSchema";
import {
  getPrismaOrThrow,
  jsonError,
  mapDbEventToOrganizerEvent,
  parseMineFlag,
  requireOrganizerAuth,
} from "../_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PUBLIC_STATUSES = [
  "PRIZE_VERIFIED",
  "LIVE",
  "JUDGING",
  "CLOSED",
  "ARCHIVED",
] as const;

export async function GET(
  request: Request,
  context: { params: { eventId: string } },
) {
  const { searchParams } = new URL(request.url);
  const mineRaw = searchParams.get("mine");
  const mine = parseMineFlag(mineRaw);
  if (mineRaw !== null && mine === null) {
    return jsonError("Invalid mine query value. Use mine=1 or mine=true.", 400, "BAD_QUERY");
  }

  try {
    let authUserId: string | null = null;
    if (mine) {
      const authResult = await requireOrganizerAuth(request);
      if (!authResult.ok) return authResult.response;
      authUserId = authResult.user.id;
    }

    const event = await loadEventById(context.params.eventId, {
      mine: Boolean(mine),
      authUserId,
    });

    if (!event) {
      return jsonError("Event not found.", 404, "EVENT_NOT_FOUND");
    }

    return NextResponse.json({ event });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to load event.",
      500,
      "EVENT_DETAIL_FAILED",
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: { eventId: string } },
) {
  try {
    const authResult = await requireOrganizerAuth(request);
    if (!authResult.ok) return authResult.response;

    const prisma = await getPrismaOrThrow();
    const existing = await prisma.event.findFirst({
      where: {
        OR: [{ id: context.params.eventId }, { slug: context.params.eventId }],
      },
      include: {
        escrowVault: true,
        _count: { select: { submissions: true } },
      },
    });

    if (!existing) {
      return jsonError("Event not found.", 404, "EVENT_NOT_FOUND");
    }

    if (existing.organizerId !== authResult.user.id) {
      return jsonError("You do not have permission to edit this event.", 403, "FORBIDDEN");
    }

    if (existing.status !== "DRAFT") {
      return jsonError("Only draft events can be edited.", 409, "EVENT_LOCKED");
    }

    const payload = (await request.json()) as unknown;
    const parsed = parsePatchDraftInput(payload);
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

    const mergedSchedule = validateMergedSchedule({
      startsAt: parsed.data.startsAt ?? existing.startsAt?.toISOString() ?? "",
      endsAt: parsed.data.endsAt ?? existing.endsAt?.toISOString() ?? "",
    });
    if (Object.keys(mergedSchedule).length > 0) {
      return NextResponse.json(
        {
          message: "Validation failed",
          errors: mergedSchedule,
          code: "VALIDATION_FAILED",
        } satisfies ApiValidationErrorResponse,
        { status: 422 },
      );
    }

    const updated = await prisma.event.update({
      where: { id: existing.id },
      data: {
        ...(parsed.data.title ? { title: parsed.data.title } : {}),
        ...(parsed.data.problemStatement
          ? { problemStatement: parsed.data.problemStatement }
          : {}),
        ...(parsed.data.prizePoolKes !== undefined
          ? { prizePoolKes: parsed.data.prizePoolKes }
          : {}),
        ...(parsed.data.startsAt
          ? { startsAt: new Date(parsed.data.startsAt) }
          : {}),
        ...(parsed.data.endsAt ? { endsAt: new Date(parsed.data.endsAt) } : {}),
      },
      include: {
        escrowVault: true,
        _count: { select: { submissions: true } },
      },
    });

    const event = mapDbEventToOrganizerEvent(updated);
    return NextResponse.json({ event });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to update event.",
      500,
      "EVENT_UPDATE_FAILED",
    );
  }
}

async function loadEventById(
  eventId: string,
  opts: { mine: boolean; authUserId: string | null },
): Promise<OrganizerEvent | null> {
  const prisma = await getPrismaOrThrow();

  const row = await prisma.event.findFirst({
    where: {
      OR: [{ id: eventId }, { slug: eventId }],
      ...(opts.mine && opts.authUserId
        ? { organizerId: opts.authUserId }
        : { status: { in: [...PUBLIC_STATUSES] } }),
    },
    include: {
      escrowVault: true,
      _count: { select: { submissions: true } },
    },
  });

  if (!row) return null;

  return mapDbEventToOrganizerEvent(row);
}
