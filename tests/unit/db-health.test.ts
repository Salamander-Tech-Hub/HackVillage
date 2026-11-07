import { afterEach, describe, expect, it, vi } from "vitest";

const originalDatabaseUrl = process.env.DATABASE_URL;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }
});

describe("checkDatabase", () => {
  it("fails closed when DATABASE_URL is missing", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const { checkDatabase } = await import("@backend/lib/db");
    const result = await checkDatabase();

    expect(result).toEqual({
      ok: false,
      error: "DATABASE_URL is not configured",
    });
  });
});
