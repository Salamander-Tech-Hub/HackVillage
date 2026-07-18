import { prisma } from "@backend/lib/db";

export type PublicEventStatus = "PRIZE_VERIFIED" | "LIVE";

export type PublicEvent = {
  id: string;
  slug: string;
  title: string;
  problemStatement: string;
  status: PublicEventStatus;
  prizePoolKes: number;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const PUBLIC_STATUSES: PublicEventStatus[] = ["PRIZE_VERIFIED", "LIVE"];

function serializeEvent(event: {
  id: string;
  slug: string;
  title: string;
  problemStatement: string;
  status: string;
  prizePoolKes: { toString(): string } | number;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): PublicEvent {
  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    problemStatement: event.problemStatement,
    status: event.status as PublicEventStatus,
    prizePoolKes: Number(event.prizePoolKes),
    startsAt: event.startsAt?.toISOString() ?? null,
    endsAt: event.endsAt?.toISOString() ?? null,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}

export async function listPublicEvents({
  page = 1,
  limit = 6,
}: {
  page?: number;
  limit?: number;
} = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(12, Math.max(1, Number(limit) || 6));

  const where = { status: { in: PUBLIC_STATUSES } };

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { startsAt: "asc" },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    }),
    prisma.event.count({ where }),
  ]);

  return {
    page: safePage,
    limit: safeLimit,
    total,
    events: events.map(serializeEvent),
  };
}

export async function getPublicEventBySlugOrId(slugOrId: string): Promise<PublicEvent | null> {
  const event = await prisma.event.findFirst({
    where: {
      status: { in: PUBLIC_STATUSES },
      OR: [{ slug: slugOrId }, { id: slugOrId }],
    },
  });

  return event ? serializeEvent(event) : null;
}
