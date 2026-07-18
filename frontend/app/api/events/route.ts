import { NextResponse } from "next/server";
import type { EventStatus as PrismaEventStatus } from "@prisma/client";
import type {
  EventsListResponse,
  OrganizerEvent,
  EventStatus,
  EscrowState,
  ApiErrorResponse,
} from "@/lib/types";

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
    const authUser = mine ? await getAuthenticatedUser(request) : null;
    if (mine && !authUser) {
      return jsonError("Authentication required.", 401, "AUTH_REQUIRED");
    }

    if (mine && authUser && !isOrganizerRole(authUser.role)) {
      return jsonError("Organizer role required.", 403, "FORBIDDEN");
    }

    const events = await loadFromDatabase({
      organizerId,
      statusFilter,
      mine: Boolean(mine),
      authUserId: authUser?.id ?? null,
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

async function loadFromDatabase(opts: {
  organizerId: string | null;
  statusFilter: PrismaEventStatus[] | null;
  mine: boolean;
  authUserId: string | null;
}): Promise<OrganizerEvent[]> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL not configured");
  }

  // Dynamic import so a missing/broken Prisma client does not crash the
  // whole route module at import time (we want the catch above to run).
  const { prisma } = await import("@backend/lib/db");

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

  return rows.map((row): OrganizerEvent => {
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
  });
}

function parseMineFlag(value: string | null): boolean | null {
  if (value === null) return false;
  if (value === "1" || value.toLowerCase() === "true") return true;
  if (value === "0" || value.toLowerCase() === "false") return false;
  return null;
}

function parseStatusFilter(value: string | null): PrismaEventStatus[] | null {
  if (!value) return null;
  const normalized = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.toUpperCase());

  const valid: PrismaEventStatus[] = [];
  for (const item of normalized) {
    if (isPrismaEventStatus(item)) {
      valid.push(item);
    }
  }
  return valid.length > 0 ? valid : null;
}

function isPrismaEventStatus(value: string): value is PrismaEventStatus {
  return (
    value === "DRAFT" ||
    value === "PENDING_ESCROW" ||
    value === "PRIZE_VERIFIED" ||
    value === "LIVE" ||
    value === "JUDGING" ||
    value === "CLOSED" ||
    value === "ARCHIVED"
  );
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
