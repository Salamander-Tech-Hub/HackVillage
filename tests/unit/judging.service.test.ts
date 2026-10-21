import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@backend/lib/db", () => ({
  prisma: {
    event: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    judgeAssignment: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { prisma } from "@backend/lib/db";
import {
  assignJudgeToEvent,
  closeEvent,
  getJudgingReadinessForEvent,
  removeJudgeFromEvent,
} from "@backend/services/events/judging.service";
import { LifecycleError } from "@backend/services/events/lifecycle";

const eventId = "evt_defi_buildathon";
const organizerId = "usr_organizer_1";

const sarah = {
  judgeId: "j1",
  judge: { id: "j1", name: "Sarah K.", email: "sarah@example.com" },
};
const amina = {
  judgeId: "j2",
  judge: { id: "j2", name: "Amina B.", email: "amina@example.com" },
};

function submission(id: string, judgeIds: string[]) {
  return {
    id,
    title: `Project ${id}`,
    team: { name: `Team ${id}` },
    feedback: judgeIds.map((judgeId) => ({ judgeId })),
  };
}

function eventRow(overrides: Record<string, unknown> = {}) {
  return {
    id: eventId,
    organizerId,
    status: "JUDGING",
    title: "DeFi Buildathon",
    problemStatement: "Build it",
    prizePoolKes: 100000,
    startsAt: null,
    endsAt: null,
    submissions: [],
    judgeAssignments: [],
    ...overrides,
  } as never;
}

describe("judging.service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("getJudgingReadinessForEvent", () => {
    it("throws NOT_FOUND when event does not exist", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue(null);
      await expect(getJudgingReadinessForEvent("non_existent")).rejects.toThrow("NOT_FOUND");
    });

    it("throws FORBIDDEN when the organizer does not own the event", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue(eventRow());
      await expect(
        getJudgingReadinessForEvent(eventId, { organizerId: "someone_else" }),
      ).rejects.toThrow("FORBIDDEN");
    });

    it("reports incomplete when no judges are assigned", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue(
        eventRow({ submissions: [submission("sub_1", [])] }),
      );

      const readiness = await getJudgingReadinessForEvent(eventId);
      expect(readiness.totalJudges).toBe(0);
      expect(readiness.totalSubmissions).toBe(1);
      expect(readiness.isReadyToClose).toBe(false);
      expect(readiness.missingReason).toMatch(/Assign at least one judge/i);
      expect(readiness.submissions[0].isComplete).toBe(false);
    });

    it("calculates per-judge and per-submission progress", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue(
        eventRow({
          submissions: [submission("sub_1", ["j1", "j2"]), submission("sub_2", ["j1"])],
          judgeAssignments: [sarah, amina],
        }),
      );

      const readiness = await getJudgingReadinessForEvent(eventId);

      expect(readiness.totalReviewsRequired).toBe(4);
      expect(readiness.totalReviewsCompleted).toBe(3);
      expect(readiness.percentage).toBe(75);
      expect(readiness.isReadyToClose).toBe(false);
      expect(readiness.missingReason).toBe("Judge Amina B. has 1 pending review.");

      expect(readiness.judges).toEqual([
        expect.objectContaining({ judgeId: "j1", reviewed: 2, total: 2, pending: 0, isComplete: true }),
        expect.objectContaining({ judgeId: "j2", reviewed: 1, total: 2, pending: 1, isComplete: false }),
      ]);
      expect(readiness.submissions).toEqual([
        { submissionId: "sub_1", title: "Project sub_1", teamName: "Team sub_1", reviewed: 2, total: 2, isComplete: true },
        { submissionId: "sub_2", title: "Project sub_2", teamName: "Team sub_2", reviewed: 1, total: 2, isComplete: false },
      ]);
    });

    it("ignores feedback from judges who are no longer assigned", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue(
        eventRow({
          submissions: [submission("sub_1", ["j1", "removed_judge"])],
          judgeAssignments: [sarah],
        }),
      );

      const readiness = await getJudgingReadinessForEvent(eventId);
      expect(readiness.submissions[0]).toMatchObject({ reviewed: 1, total: 1 });
    });

    it("marks isReadyToClose true when all judges have reviewed all submissions", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue(
        eventRow({
          submissions: [submission("sub_1", ["j1", "j2"]), submission("sub_2", ["j1", "j2"])],
          judgeAssignments: [sarah, amina],
        }),
      );

      const readiness = await getJudgingReadinessForEvent(eventId);
      expect(readiness.isReadyToClose).toBe(true);
      expect(readiness.percentage).toBe(100);
      expect(readiness.missingReason).toBeNull();
    });
  });

  describe("assignJudgeToEvent", () => {
    it("rejects non-owner requests", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue(
        eventRow({ organizerId: "another_organizer", status: "LIVE" }),
      );

      await expect(
        assignJudgeToEvent(eventId, organizerId, { email: "judge@example.com" }),
      ).rejects.toThrow("FORBIDDEN");
    });

    it("validates email", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue(eventRow({ status: "LIVE" }));

      await expect(
        assignJudgeToEvent(eventId, organizerId, { email: "invalid-email" }),
      ).rejects.toThrow("INVALID_EMAIL");
    });

    it("blocks adding a judge after judging has started", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue(eventRow({ status: "JUDGING" }));

      await expect(
        assignJudgeToEvent(eventId, organizerId, { email: "judge@example.com" }),
      ).rejects.toThrow("Cannot add a judge after judging has started.");
      expect(prisma.judgeAssignment.upsert).not.toHaveBeenCalled();
    });

    it("refuses to assign an existing non-judge account without changing its role", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue(eventRow({ status: "LIVE" }));
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "org_2",
        email: "organizer@example.com",
        role: "ORGANIZER",
      } as never);

      await expect(
        assignJudgeToEvent(eventId, organizerId, { email: "organizer@example.com" }),
      ).rejects.toThrow("NOT_A_JUDGE");
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.judgeAssignment.upsert).not.toHaveBeenCalled();
    });

    it("creates a JUDGE account for a new email and assigns it", async () => {
      vi.mocked(prisma.event.findUnique)
        .mockResolvedValueOnce(eventRow({ status: "LIVE" }))
        .mockResolvedValueOnce(eventRow({ status: "LIVE", judgeAssignments: [sarah] }));
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue({ id: "j1" } as never);

      const result = await assignJudgeToEvent(eventId, organizerId, {
        email: " Sarah@Example.com ",
        name: "Sarah K.",
      });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { email: "sarah@example.com", name: "Sarah K.", role: "JUDGE" },
      });
      expect(prisma.judgeAssignment.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { eventId_judgeId: { eventId, judgeId: "j1" } },
        }),
      );
      expect(result.totalJudges).toBe(1);
    });

    it("reuses an existing judge account", async () => {
      vi.mocked(prisma.event.findUnique)
        .mockResolvedValueOnce(eventRow({ status: "DRAFT" }))
        .mockResolvedValueOnce(eventRow({ status: "DRAFT", judgeAssignments: [sarah] }));
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "j1",
        email: "sarah@example.com",
        role: "JUDGE",
      } as never);

      await assignJudgeToEvent(eventId, organizerId, { email: "sarah@example.com" });

      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.judgeAssignment.upsert).toHaveBeenCalled();
    });
  });

  describe("removeJudgeFromEvent", () => {
    it("allows removing a judge before judging starts", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue(eventRow({ status: "LIVE" }));
      vi.mocked(prisma.judgeAssignment.deleteMany).mockResolvedValue({ count: 1 });

      const result = await removeJudgeFromEvent(eventId, organizerId, "j1");

      expect(prisma.judgeAssignment.deleteMany).toHaveBeenCalledWith({
        where: { eventId, judgeId: "j1" },
      });
      expect(result.totalJudges).toBe(0);
    });

    it("blocks removing a judge after judging has started", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue(eventRow({ status: "JUDGING" }));

      await expect(removeJudgeFromEvent(eventId, organizerId, "j1")).rejects.toThrow(
        "Cannot remove a judge after judging has started.",
      );
      expect(prisma.judgeAssignment.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe("closeEvent", () => {
    it("blocks closing when judging is incomplete and explains why", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue(
        eventRow({ submissions: [submission("sub_1", [])], judgeAssignments: [sarah] }),
      );

      await expect(closeEvent(eventId, organizerId)).rejects.toThrow(
        "Judge Sarah K. has 1 pending review.",
      );
      expect(prisma.event.updateMany).not.toHaveBeenCalled();
    });

    it("rejects closing an event that is not in JUDGING", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue(eventRow({ status: "LIVE" }));

      await expect(closeEvent(eventId, organizerId)).rejects.toThrow(LifecycleError);
      expect(prisma.event.updateMany).not.toHaveBeenCalled();
    });

    it("closes the event when all judging reviews are complete", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue(
        eventRow({ submissions: [submission("sub_1", ["j1"])], judgeAssignments: [sarah] }),
      );
      vi.mocked(prisma.event.updateMany).mockResolvedValue({ count: 1 });

      const result = await closeEvent(eventId, organizerId);

      expect(result.status).toBe("CLOSED");
      expect(prisma.event.updateMany).toHaveBeenCalledWith({
        where: { id: eventId, status: "JUDGING" },
        data: { status: "CLOSED" },
      });
    });

    it("fails if the event changed status while closing", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue(
        eventRow({ submissions: [submission("sub_1", ["j1"])], judgeAssignments: [sarah] }),
      );
      vi.mocked(prisma.event.updateMany).mockResolvedValue({ count: 0 });

      await expect(closeEvent(eventId, organizerId)).rejects.toThrow(LifecycleError);
    });
  });
});
