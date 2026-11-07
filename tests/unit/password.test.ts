import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@backend/lib/password";

describe("password hashes", () => {
  it("round-trips a strong password", async () => {
    const stored = await hashPassword("hackvillage-demo");
    expect(stored.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("hackvillage-demo", stored)).toBe(true);
    expect(await verifyPassword("wrong-password", stored)).toBe(false);
  });

  it("rejects short passwords", async () => {
    await expect(hashPassword("short")).rejects.toThrow(/8 characters/);
  });
});
