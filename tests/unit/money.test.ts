import { describe, expect, it } from "vitest";
import { maskAccount, splitPrizePool } from "@backend/services/money/money";

describe("money helpers", () => {
  it("masks account numbers", () => {
    expect(maskAccount("254700000123")).toBe("254****123");
  });

  it("splits a prize pool into instant and milestone halves per winner", () => {
    expect(splitPrizePool(500000, 1)).toEqual({ instantKes: 250000, milestoneKes: 250000 });
    expect(splitPrizePool(500000, 2)).toEqual({ instantKes: 125000, milestoneKes: 125000 });
  });
});
