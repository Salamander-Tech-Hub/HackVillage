import { randomUUID } from "crypto";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function buildMockEventStore() {
  const seedEvents = [
    {
      id: "mock-event-1",
      slug: "nairobi-climate-sprint",
      title: "Nairobi Climate Sprint",
      problemStatement: "Build tools that help Kenyan communities track and reduce local emissions.",
      status: "PRIZE_VERIFIED",
      prizePoolKes: 500_000,
      startsAt: "2026-08-14T08:00:00.000Z",
      endsAt: "2026-08-16T18:00:00.000Z",
      organizerId: "mock-organizer",
      createdAt: "2026-07-10T10:20:00.000Z",
      updatedAt: "2026-07-10T10:20:00.000Z",
    },
    {
      id: "mock-event-2",
      slug: "mombasa-fintech-jam",
      title: "Mombasa Fintech Jam",
      problemStatement: "Ship a mobile-first payment or savings tool that works offline in coastal Kenya.",
      status: "LIVE",
      prizePoolKes: 750_000,
      startsAt: "2026-07-18T09:00:00.000Z",
      endsAt: "2026-07-20T20:00:00.000Z",
      organizerId: "mock-organizer",
      createdAt: "2026-07-18T07:30:00.000Z",
      updatedAt: "2026-07-18T07:30:00.000Z",
    },
  ];

  return seedEvents.map((event) => ({
    ...event,
    startsAt: event.startsAt ? new Date(event.startsAt) : null,
    endsAt: event.endsAt ? new Date(event.endsAt) : null,
    createdAt: new Date(event.createdAt),
    updatedAt: new Date(event.updatedAt),
  }));
}

function createMockPrismaClient(): PrismaClient {
  const events = buildMockEventStore();

  return {
    event: {
      findMany: async (args: Record<string, unknown> = {}) => {
        const where = (args.where as Record<string, unknown> | undefined) ?? {};
        const statusFilter = where.status as { in?: string[] } | undefined;
        const organizerFilter = where.organizerId as string | undefined;
        const filterByStatus = (event: (typeof events)[number]) => {
          if (!statusFilter?.in) {
            return true;
          }
          return statusFilter.in.includes(event.status);
        };
        const filterByOrganizer = (event: (typeof events)[number]) => {
          if (!organizerFilter) {
            return true;
          }
          return event.organizerId === organizerFilter;
        };

        const filtered = events.filter(filterByStatus).filter(filterByOrganizer);
        const orderBy = args.orderBy as Record<string, string> | undefined;

        if (orderBy?.startsAt === "asc") {
          filtered.sort(
            (left, right) =>
              (left.startsAt?.getTime() ?? Number.MAX_SAFE_INTEGER) -
              (right.startsAt?.getTime() ?? Number.MAX_SAFE_INTEGER),
          );
        } else if (orderBy?.createdAt === "desc") {
          filtered.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
        }

        const skip = Number(args.skip ?? 0);
        const take = Number(args.take ?? filtered.length);
        return filtered.slice(skip, skip + take);
      },
      count: async (args: Record<string, unknown> = {}) => {
        const where = (args.where as Record<string, unknown> | undefined) ?? {};
        const statusFilter = where.status as { in?: string[] } | undefined;
        const organizerFilter = where.organizerId as string | undefined;
        return events.filter((event) => {
          if (statusFilter?.in && !statusFilter.in.includes(event.status)) {
            return false;
          }
          if (organizerFilter && event.organizerId !== organizerFilter) {
            return false;
          }
          return true;
        }).length;
      },
      findFirst: async (args: Record<string, unknown> = {}) => {
        const where = (args.where as Record<string, unknown> | undefined) ?? {};
        const statusFilter = where.status as { in?: string[] } | undefined;
        const ors = (where.OR as Array<Record<string, unknown>> | undefined) ?? [];

        return events.find((event) => {
          if (statusFilter?.in && !statusFilter.in.includes(event.status)) {
            return false;
          }
          return ors.some((clause) => {
            if (clause.slug) {
              return event.slug === clause.slug;
            }
            if (clause.id) {
              return event.id === clause.id;
            }
            return false;
          });
        });
      },
      findUnique: async (args: Record<string, unknown> = {}) => {
        const where = (args.where as Record<string, unknown> | undefined) ?? {};
        return events.find((event) => event.id === where.id) ?? null;
      },
      create: async (args: Record<string, unknown> = {}) => {
        const data = (args.data as Record<string, unknown> | undefined) ?? {};
        const created = {
          id: typeof data.id === "string" ? data.id : randomUUID(),
          slug: typeof data.slug === "string" ? data.slug : "mock-event",
          title: typeof data.title === "string" ? data.title : "Untitled Event",
          problemStatement:
            typeof data.problemStatement === "string" ? data.problemStatement : "",
          status: typeof data.status === "string" ? data.status : "DRAFT",
          prizePoolKes: Number(data.prizePoolKes ?? 0),
          startsAt: data.startsAt ? new Date(String(data.startsAt)) : null,
          endsAt: data.endsAt ? new Date(String(data.endsAt)) : null,
          organizerId: typeof data.organizerId === "string" ? data.organizerId : "mock-organizer",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        events.push(created);
        return created;
      },
      update: async (args: Record<string, unknown> = {}) => {
        const where = (args.where as Record<string, unknown> | undefined) ?? {};
        const data = (args.data as Record<string, unknown> | undefined) ?? {};
        const existing = events.find((event) => event.id === where.id);
        if (!existing) {
          throw new Error("NOT_FOUND");
        }

        const updated = {
          ...existing,
          ...data,
          updatedAt: new Date(),
          createdAt: existing.createdAt,
          startsAt: data.startsAt ? new Date(String(data.startsAt)) : existing.startsAt,
          endsAt: data.endsAt ? new Date(String(data.endsAt)) : existing.endsAt,
        };
        Object.assign(existing, updated);
        return updated;
      },
    },
  } as unknown as PrismaClient;
}

const shouldUseMockPrisma = !process.env.DATABASE_URL;

export const prisma = globalForPrisma.prisma ?? (shouldUseMockPrisma
  ? createMockPrismaClient()
  : new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    }));

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
