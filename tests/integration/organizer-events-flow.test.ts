import { beforeEach, describe, expect, it, vi } from "vitest";

type DbEvent = {
  id: string;
  slug: string;
  title: string;
  problemStatement: string;
  status: "DRAFT";
  prizePoolKes: number;
  startsAt: Date;
  endsAt: Date;
  mediaDeadlineAt: null;
  organizerId: string;
  updatedAt: Date;
  createdAt: Date;
  escrowVault: null;
  _count: { submissions: number };
};

const store: { events: DbEvent[] } = { events: [] };

const prisma = {
  user: {
    findFirst: vi.fn(async ({ where }: { where: { id?: string; email?: string } }) => {
      if (where.id === "org_1" || where.email === "organizer@hackvillage.local") {
        return { id: "org_1", role: "ORGANIZER" };
      }
      return null;
    }),
  },
  event: {
    findUnique: vi.fn(async ({ where }: { where: { slug: string } }) => {
      return store.events.find((event) => event.slug === where.slug) ?? null;
    }),
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      const event: DbEvent = {
        id: `evt_${store.events.length + 1}`,
        slug: String(data.slug),
        title: String(data.title),
        problemStatement: String(data.problemStatement),
        status: "DRAFT",
        prizePoolKes: Number(data.prizePoolKes),
        startsAt: new Date(String(data.startsAt)),
        endsAt: new Date(String(data.endsAt)),
        mediaDeadlineAt: null,
        organizerId: String(data.organizerId),
        updatedAt: new Date(),
        createdAt: new Date(),
        escrowVault: null,
        _count: { submissions: 0 },
      };
      store.events.push(event);
      return event;
    }),
    findMany: vi.fn(async ({ where }: { where?: { organizerId?: string } }) => {
      if (where?.organizerId) {
        return store.events.filter((event) => event.organizerId === where.organizerId);
      }
      return store.events;
    }),
    findFirst: vi.fn(async ({ where }: { where: { OR: Array<{ id?: string; slug?: string }>; organizerId?: string } }) => {
      const id = where.OR[0]?.id;
      const slug = where.OR[1]?.slug;
      const found = store.events.find(
        (event) => event.id === id || event.slug === slug,
      );
      if (!found) return null;
      if (where.organizerId && found.organizerId !== where.organizerId) return null;
      return found;
    }),
    update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
      const index = store.events.findIndex((event) => event.id === where.id);
      if (index < 0) throw new Error("Not found");
      const current = store.events[index];
      const updated: DbEvent = {
        ...current,
        ...("title" in data ? { title: String(data.title) } : {}),
        ...("problemStatement" in data ? { problemStatement: String(data.problemStatement) } : {}),
        ...("prizePoolKes" in data ? { prizePoolKes: Number(data.prizePoolKes) } : {}),
        ...("startsAt" in data ? { startsAt: new Date(String(data.startsAt)) } : {}),
        ...("endsAt" in data ? { endsAt: new Date(String(data.endsAt)) } : {}),
        updatedAt: new Date(),
      };
      store.events[index] = updated;
      return updated;
    }),
  },
};

vi.mock("@backend/lib/db", () => ({ prisma }));

describe("organizer event flow integration", () => {
  beforeEach(() => {
    store.events.length = 0;
    vi.clearAllMocks();
    process.env.DATABASE_URL = "postgresql://demo";
  });

  it("creates, lists, updates, and relists organizer event", async () => {
    const { POST, GET: listEvents } = await import("@/app/api/events/route");
    const { PATCH } = await import("@/app/api/events/[eventId]/route");

    const createResponse = await POST(
      new Request("http://localhost:3000/api/events", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-hackvillage-user-id": "org_1",
        },
        body: JSON.stringify({
          title: "Nairobi Green Sprint",
          problemStatement: "Build climate resilience tools for local communities.",
          prizePoolKes: 150000,
          startsAt: "2026-09-01T10:00:00.000Z",
          endsAt: "2026-09-01T18:00:00.000Z",
        }),
      }),
    );

    expect(createResponse.status).toBe(201);
    const created = await createResponse.json();
    const eventId = created.event.id as string;

    const listResponse = await listEvents(
      new Request("http://localhost:3000/api/events?mine=1", {
        headers: { "x-hackvillage-user-id": "org_1" },
      }),
    );

    expect(listResponse.status).toBe(200);
    const listPayload = await listResponse.json();
    expect(listPayload.events).toHaveLength(1);

    const patchResponse = await PATCH(
      new Request(`http://localhost:3000/api/events/${eventId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-hackvillage-user-id": "org_1",
        },
        body: JSON.stringify({ title: "Nairobi Green Sprint Updated" }),
      }),
      { params: { eventId } },
    );

    expect(patchResponse.status).toBe(200);

    const listAgainResponse = await listEvents(
      new Request("http://localhost:3000/api/events?mine=1", {
        headers: { "x-hackvillage-user-id": "org_1" },
      }),
    );

    const listAgain = await listAgainResponse.json();
    expect(listAgain.events[0].title).toBe("Nairobi Green Sprint Updated");
  });
});
