import { NextResponse } from "next/server";
import type { EventStatus as PrismaEventStatus } from "@prisma/client";
import type { ApiErrorResponse, EscrowState, EventStatus, OrganizerEvent } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PUBLIC_STATUSES: PrismaEventStatus[] = [
  "PRIZE_VERIFIED",
  "LIVE",
  "JUDGING",
  "CLOSED",
  "ARCHIVED",
];

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
    const authUser = mine ? await getAuthenticatedUser(request) : null;
    if (mine && !authUser) {
      return jsonError("Authentication required.", 401, "AUTH_REQUIRED");
    }
    if (mine && authUser && !isOrganizerRole(authUser.role)) {
      return jsonError("Organizer role required.", 403, "FORBIDDEN");
    }

    const event = await loadEventById(context.params.eventId, {
      mine: Boolean(mine),
      authUserId: authUser?.id ?? null,
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

async function loadEventById(
  eventId: string,
  opts: { mine: boolean; authUserId: string | null },
): Promise<OrganizerEvent | null> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL not configured");
  }

  const { prisma } = await import("@backend/lib/db");

  const row = await prisma.event.findFirst({
    where: {
      OR: [{ id: eventId }, { slug: eventId }],
      ...(opts.mine && opts.authUserId
        ? { organizerId: opts.authUserId }
        : { status: { in: PUBLIC_STATUSES } }),
    },
    include: {
      escrowVault: true,
      _count: { select: { submissions: true } },
    },
  });

  if (!row) return null;

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    problemStatement: row.problemStatement,
    status: row.status as EventStatus,
    prizePoolKes: Number(row.prizePoolKes),
    startsAt: row.startsAt ? row.startsAt.toISOString() : null,
    endsAt: row.endsAt ? row.endsAt.toISOString() : null,
    location: null,
    format: null,
    registrationsCount: null,
    submissionsCount: row._count.submissions,
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
    escrow: row.escrowVault
      ? {
          state: row.escrowVault.state as EscrowState,
          amountKes: Number(row.escrowVault.amountKes),
          publicLedgerUrl: row.escrowVault.publicLedgerUrl ?? null,
        }
      : null,
  };
}

function parseMineFlag(value: string | null): boolean | null {
  if (value === null) return false;
  if (value === "1" || value.toLowerCase() === "true") return true;
  if (value === "0" || value.toLowerCase() === "false") return false;
  return null;
}

type AuthUser = { id: string; role: string };

async function getAuthenticatedUser(request: Request): Promise<AuthUser | null> {
  const userId = request.headers.get("x-hackvillage-user-id");
  const userEmail = request.headers.get("x-hackvillage-user-email");
  if (!userId && !userEmail) return null;

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL not configured");
  }

  const { prisma } = await import("@backend/lib/db");
  const user = await prisma.user.findFirst({
    where: userId ? { id: userId } : { email: userEmail ?? "" },
    select: { id: true, role: true },
  });

  return user ? { id: user.id, role: user.role } : null;
}

function isOrganizerRole(role: string): boolean {
  return role === "ORGANIZER" || role === "ADMIN";
}

function jsonError(message: string, status: number, code: string) {
  const payload: ApiErrorResponse = {
    error: message,
    code,
  };
  return NextResponse.json(payload, { status });
}
