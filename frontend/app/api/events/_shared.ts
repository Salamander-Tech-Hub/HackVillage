import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import type { ApiErrorResponse, OrganizerEvent, EscrowState, EventStatus } from "@/lib/types";

type PrismaEventStatus =
  | "DRAFT"
  | "PENDING_ESCROW"
  | "PRIZE_VERIFIED"
  | "LIVE"
  | "JUDGING"
  | "CLOSED"
  | "ARCHIVED";

export type AuthUser = { id: string; role: string };

export function jsonError(message: string, status: number, code: string) {
  const payload: ApiErrorResponse = {
    error: message,
    code,
  };
  return NextResponse.json(payload, { status });
}

export function parseMineFlag(value: string | null): boolean | null {
  if (value === null) return false;
  if (value === "1" || value.toLowerCase() === "true") return true;
  if (value === "0" || value.toLowerCase() === "false") return false;
  return null;
}

export function parseStatusFilter(value: string | null): PrismaEventStatus[] | null {
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

export function isPrismaEventStatus(value: string): value is PrismaEventStatus {
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

export function isOrganizerRole(role: string): boolean {
  return role === "ORGANIZER" || role === "ADMIN";
}

export async function getAuthenticatedUser(request: Request): Promise<AuthUser | null> {
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

export function mapDbEventToOrganizerEvent(
  row: Prisma.EventGetPayload<{
    include: { escrowVault: true; _count: { select: { submissions: true } } };
  }>,
): OrganizerEvent {
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

export async function getPrismaOrThrow() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL not configured");
  }
  const { prisma } = await import("@backend/lib/db");
  return prisma;
}

export async function requireOrganizerAuth(request: Request): Promise<
  | { ok: true; user: AuthUser }
  | { ok: false; response: NextResponse }
> {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return {
      ok: false,
      response: jsonError("Authentication required.", 401, "AUTH_REQUIRED"),
    };
  }
  if (!isOrganizerRole(user.role)) {
    return {
      ok: false,
      response: jsonError("Organizer role required.", 403, "FORBIDDEN"),
    };
  }
  return { ok: true, user };
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

export async function buildUniqueSlug(title: string): Promise<string> {
  const prisma = await getPrismaOrThrow();
  const base = slugify(title) || "event";
  const candidate = `${base}-${Math.random().toString(36).slice(2, 8)}`;
  const existing = await prisma.event.findUnique({
    where: { slug: candidate },
    select: { id: true },
  });
  if (!existing) return candidate;
  return `${candidate}-${Math.random().toString(36).slice(2, 5)}`;
}
