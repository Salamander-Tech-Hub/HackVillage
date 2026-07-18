import { expect, test, vi, describe, beforeEach } from "vitest";
import { POST, GET } from "../../../frontend/app/api/events/route";
import { PATCH, GET as GET_ID } from "../../../frontend/app/api/events/[id]/route";
import { NextRequest } from "next/server";

vi.mock("@backend/lib/auth", () => ({
  requireRole: vi.fn(),
}));

vi.mock("@backend/services/events/events.service", () => ({
  createDraftEvent: vi.fn(),
  getOrganizerEvents: vi.fn(),
  getEventDetail: vi.fn(),
  updateEventDraft: vi.fn(),
}));

import { requireRole } from "@backend/lib/auth";
import * as eventsService from "@backend/services/events/events.service";

describe("Events API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("POST /api/events", () => {
    test("unauthorized returns 401", async () => {
      vi.mocked(requireRole).mockRejectedValue(new Error("Unauthorized: Insufficient role"));
      const req = new NextRequest("http://localhost/api/events", {
        method: "POST",
        body: JSON.stringify({ title: "test", problem_statement: "test", prize_total: 100 }),
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error.code).toBe("UNAUTHORIZED");
    });

    test("happy path", async () => {
      vi.mocked(requireRole).mockResolvedValue({ id: "org-1", role: "ORGANIZER" } as any);
      vi.mocked(eventsService.createDraftEvent).mockResolvedValue({ id: "event-1" } as any);
      
      const req = new NextRequest("http://localhost/api/events", {
        method: "POST",
        body: JSON.stringify({ title: "test", problem_statement: "test", prize_total: 100 }),
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.id).toBe("event-1");
    });

    test("validation error returns 400", async () => {
      vi.mocked(requireRole).mockResolvedValue({ id: "org-1", role: "ORGANIZER" } as any);
      
      const req = new NextRequest("http://localhost/api/events", {
        method: "POST",
        body: JSON.stringify({ title: "" }), // Missing fields
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("GET /api/events", () => {
    test("missing ?mine=1 returns 400", async () => {
      vi.mocked(requireRole).mockResolvedValue({ id: "org-1", role: "ORGANIZER" } as any);
      const req = new NextRequest("http://localhost/api/events");
      const res = await GET(req);
      expect(res.status).toBe(400);
    });

    test("happy path", async () => {
      vi.mocked(requireRole).mockResolvedValue({ id: "org-1", role: "ORGANIZER" } as any);
      vi.mocked(eventsService.getOrganizerEvents).mockResolvedValue([{ id: "event-1" }] as any);
      
      const req = new NextRequest("http://localhost/api/events?mine=1");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data[0].id).toBe("event-1");
    });
  });

  describe("GET /api/events/:id", () => {
    test("returns 404 if missing", async () => {
      vi.mocked(requireRole).mockResolvedValue({ id: "org-1", role: "ORGANIZER" } as any);
      vi.mocked(eventsService.getEventDetail).mockResolvedValue(null);
      const req = new NextRequest("http://localhost/api/events/1");
      const res = await GET_ID(req, { params: { id: "1" } });
      expect(res.status).toBe(404);
    });
    
    test("returns 403 if user does not own event", async () => {
      vi.mocked(requireRole).mockResolvedValue({ id: "org-1", role: "ORGANIZER" } as any);
      vi.mocked(eventsService.getEventDetail).mockResolvedValue({ id: "1", organizerId: "org-2" } as any);
      const req = new NextRequest("http://localhost/api/events/1");
      const res = await GET_ID(req, { params: { id: "1" } });
      expect(res.status).toBe(403);
    });
  });

  describe("PATCH /api/events/:id", () => {
    test("unauthorized returns 401", async () => {
      vi.mocked(requireRole).mockRejectedValue(new Error("Unauthorized: Insufficient role"));
      const req = new NextRequest("http://localhost/api/events/1", {
        method: "PATCH",
        body: JSON.stringify({ title: "new title" }),
      });
      const res = await PATCH(req, { params: { id: "1" } });
      expect(res.status).toBe(401);
    });

    test("happy path", async () => {
      vi.mocked(requireRole).mockResolvedValue({ id: "org-1", role: "ORGANIZER" } as any);
      vi.mocked(eventsService.updateEventDraft).mockResolvedValue({ id: "1", title: "new title" } as any);
      const req = new NextRequest("http://localhost/api/events/1", {
        method: "PATCH",
        body: JSON.stringify({ title: "new title" }),
      });
      const res = await PATCH(req, { params: { id: "1" } });
      expect(res.status).toBe(200);
    });
  });
});
