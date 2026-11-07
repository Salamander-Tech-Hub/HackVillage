export class MoneyError extends Error {
  code: "NOT_FOUND" | "FORBIDDEN" | "PRECONDITION_FAILED" | "CONFLICT";

  constructor(code: MoneyError["code"], message: string) {
    super(message);
    this.name = "MoneyError";
    this.code = code;
  }
}

export function maskAccount(value: string): string {
  const compact = value.replace(/\s+/g, "");
  if (compact.length <= 4) {
    return "****";
  }
  return `${compact.slice(0, 3)}****${compact.slice(-3)}`;
}

export function splitPrizePool(amountKes: number, winnerCount: number): {
  instantKes: number;
  milestoneKes: number;
} {
  if (winnerCount < 1) {
    throw new MoneyError("PRECONDITION_FAILED", "Declare at least one winner before paying out.");
  }
  const share = Math.floor(amountKes / winnerCount);
  const instantKes = Math.floor(share / 2);
  return {
    instantKes,
    milestoneKes: share - instantKes,
  };
}
