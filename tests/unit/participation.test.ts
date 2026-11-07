import { describe, expect, it } from "vitest";
import {
  assertOpenForParticipation,
  assertOpenForSubmission,
  ParticipationError,
} from "@backend/services/participation/participation";

describe("participation gates", () => {
  it("allows register and teams only on prize-verified or live events", () => {
    expect(() => assertOpenForParticipation("PRIZE_VERIFIED")).not.toThrow();
    expect(() => assertOpenForParticipation("LIVE")).not.toThrow();
    expect(() => assertOpenForParticipation("DRAFT")).toThrow(ParticipationError);
    expect(() => assertOpenForParticipation("JUDGING")).toThrow(ParticipationError);
  });

  it("allows submissions only on prize-verified or live events", () => {
    expect(() => assertOpenForSubmission("LIVE")).not.toThrow();
    expect(() => assertOpenForSubmission("CLOSED")).toThrow(/live/i);
  });
});
