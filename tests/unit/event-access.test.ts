import { describe, expect, it } from "vitest";
import {
  canListJudges,
  canListTeams,
  TEAM_LIST_PUBLIC_STATUSES,
  type EventAccessFacts,
} from "@backend/services/events/access";

const OWNER = "user_owner";

function facts(overrides: {
  role?: "DEVELOPER" | "ORGANIZER" | "JUDGE" | "ADMIN";
  userId?: string;
  signedIn?: boolean;
  status?: string;
  isAssignedJudge?: boolean;
  isRegisteredParticipant?: boolean;
}): EventAccessFacts {
  const signedIn = overrides.signedIn ?? true;
  return {
    event: { organizerId: OWNER, status: overrides.status ?? "DRAFT" },
    viewer: signedIn
      ? { userId: overrides.userId ?? "user_other", role: overrides.role ?? "DEVELOPER" }
      : null,
    isAssignedJudge: overrides.isAssignedJudge ?? false,
    isRegisteredParticipant: overrides.isRegisteredParticipant ?? false,
  };
}

describe("canListJudges", () => {
  it("allows the event owner", () => {
    expect(canListJudges(facts({ userId: OWNER, role: "ORGANIZER" }))).toEqual({ allowed: true });
  });

  it("allows an admin on any event", () => {
    expect(canListJudges(facts({ role: "ADMIN" }))).toEqual({ allowed: true });
  });

  it("allows a judge assigned to that event", () => {
    expect(canListJudges(facts({ role: "JUDGE", isAssignedJudge: true }))).toEqual({
      allowed: true,
    });
  });

  it("forbids an organizer who does not own the event", () => {
    expect(canListJudges(facts({ role: "ORGANIZER" }))).toEqual({
      allowed: false,
      reason: "FORBIDDEN",
    });
  });

  it("forbids a judge who is not assigned to the event", () => {
    expect(canListJudges(facts({ role: "JUDGE" }))).toEqual({
      allowed: false,
      reason: "FORBIDDEN",
    });
  });

  it("forbids a participant, even on a live event", () => {
    expect(
      canListJudges(facts({ role: "DEVELOPER", status: "LIVE", isRegisteredParticipant: true })),
    ).toEqual({ allowed: false, reason: "FORBIDDEN" });
  });

  it("answers UNAUTHORIZED when nobody is signed in", () => {
    expect(canListJudges(facts({ signedIn: false }))).toEqual({
      allowed: false,
      reason: "UNAUTHORIZED",
    });
  });
});

describe("canListTeams", () => {
  it("allows the owner on a draft event", () => {
    expect(canListTeams(facts({ userId: OWNER, role: "ORGANIZER", status: "DRAFT" }))).toEqual({
      allowed: true,
    });
  });

  it("allows an admin on a draft event", () => {
    expect(canListTeams(facts({ role: "ADMIN", status: "DRAFT" }))).toEqual({ allowed: true });
  });

  it("allows an assigned judge on a draft event", () => {
    expect(canListTeams(facts({ role: "JUDGE", isAssignedJudge: true }))).toEqual({
      allowed: true,
    });
  });

  it("allows a registered participant on a draft event", () => {
    expect(canListTeams(facts({ isRegisteredParticipant: true }))).toEqual({ allowed: true });
  });

  it.each(["DRAFT", "PENDING_ESCROW", "PRIZE_VERIFIED"])(
    "forbids an unrelated developer while the event is %s",
    (status) => {
      expect(canListTeams(facts({ role: "DEVELOPER", status }))).toEqual({
        allowed: false,
        reason: "FORBIDDEN",
      });
    },
  );

  it("forbids an unrelated organizer and an unassigned judge on a draft event", () => {
    expect(canListTeams(facts({ role: "ORGANIZER" })).allowed).toBe(false);
    expect(canListTeams(facts({ role: "JUDGE" })).allowed).toBe(false);
  });

  it.each(["LIVE", "JUDGING", "CLOSED", "ARCHIVED"])(
    "allows any signed-in user once the event is %s",
    (status) => {
      expect(canListTeams(facts({ role: "DEVELOPER", status }))).toEqual({ allowed: true });
    },
  );

  it.each(["LIVE", "JUDGING", "CLOSED", "ARCHIVED"])(
    "allows a visitor who is not signed in once the event is %s",
    (status) => {
      expect(canListTeams(facts({ signedIn: false, status }))).toEqual({ allowed: true });
    },
  );

  it("keeps the public statuses to published events only", () => {
    expect(TEAM_LIST_PUBLIC_STATUSES).not.toContain("DRAFT");
    expect(TEAM_LIST_PUBLIC_STATUSES).not.toContain("PENDING_ESCROW");
    expect(TEAM_LIST_PUBLIC_STATUSES).not.toContain("PRIZE_VERIFIED");
  });

  it.each(["DRAFT", "PENDING_ESCROW", "PRIZE_VERIFIED"])(
    "answers UNAUTHORIZED when nobody is signed in and the event is %s",
    (status) => {
      expect(canListTeams(facts({ signedIn: false, status }))).toEqual({
        allowed: false,
        reason: "UNAUTHORIZED",
      });
    },
  );
});
