import { describe, expect, it } from "vitest";
import {
  buildParticipantProjects,
  canPickWinners,
  filterParticipantProjects,
  sameWinnerSet,
  winnerIdsFromSubmissions,
} from "@/lib/participants";
import type { OrganizerSubmission, OrganizerTeam } from "@/lib/types";

const team = (id: string, name: string, email = `${id}@hackvillage.local`): OrganizerTeam => ({
  id,
  eventId: "evt-1",
  name,
  members: [{ userId: id, name, email }],
});

const submission = (
  overrides: Partial<OrganizerSubmission> & Pick<OrganizerSubmission, "id" | "teamId">,
): OrganizerSubmission => ({
  eventId: "evt-1",
  teamName: "Untitled team",
  title: "Project",
  repoUrl: null,
  demoUrl: null,
  status: "DEMO",
  isWinner: false,
  ...overrides,
});

describe("participant project rows", () => {
  it("joins submissions to their teams and keeps teams that have not submitted", () => {
    const rows = buildParticipantProjects(
      [team("team-a", "Rootline"), team("team-b", "Triage")],
      [
        submission({
          id: "sub-1",
          teamId: "team-a",
          teamName: "Rootline",
          title: "SoilSense",
          repoUrl: "https://github.com/rootline/soilsense",
          isWinner: true,
        }),
      ],
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      submissionId: "sub-1",
      title: "SoilSense",
      teamName: "Rootline",
      isWinner: true,
    });
    expect(rows[1]).toMatchObject({
      teamId: "team-b",
      title: null,
      submissionId: null,
    });
  });

  it("still lists a submission when its team payload is missing", () => {
    const rows = buildParticipantProjects(
      [],
      [submission({ id: "sub-2", teamId: "missing", teamName: "Ledgerlight", title: "FlowPay" })],
    );
    expect(rows[0].teamName).toBe("Ledgerlight");
    expect(rows[0].members).toEqual([]);
  });

  it("filters by title, team, repo, or member", () => {
    const rows = buildParticipantProjects(
      [team("team-a", "Rootline", "ada@hackvillage.local")],
      [
        submission({
          id: "sub-1",
          teamId: "team-a",
          title: "SoilSense",
          repoUrl: "https://github.com/rootline/soilsense",
        }),
      ],
    );

    expect(filterParticipantProjects(rows, "soil")).toHaveLength(1);
    expect(filterParticipantProjects(rows, "ada@")).toHaveLength(1);
    expect(filterParticipantProjects(rows, "nilepay")).toHaveLength(0);
  });
});

describe("winner selection", () => {
  it("is only available while judging or closed", () => {
    expect(canPickWinners("LIVE")).toBe(false);
    expect(canPickWinners("JUDGING")).toBe(true);
    expect(canPickWinners("CLOSED")).toBe(true);
  });

  it("reads current winners and detects an unchanged set", () => {
    const ids = winnerIdsFromSubmissions([
      submission({ id: "sub-1", teamId: "team-a", isWinner: true }),
      submission({ id: "sub-2", teamId: "team-b", isWinner: false }),
    ]);
    expect(ids).toEqual(["sub-1"]);
    expect(sameWinnerSet(ids, ["sub-1"])).toBe(true);
    expect(sameWinnerSet(ids, ["sub-2"])).toBe(false);
  });
});
