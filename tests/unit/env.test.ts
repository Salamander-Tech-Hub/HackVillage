import { afterEach, describe, expect, it, vi } from "vitest";
import { validateRuntimeEnv } from "@backend/lib/env";

const originalDatabaseUrl = process.env.DATABASE_URL;
const originalNextAuthSecret = process.env.NEXTAUTH_SECRET;
const originalAuthSecret = process.env.AUTH_SECRET;

afterEach(() => {
  vi.unstubAllEnvs();
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }
  if (originalNextAuthSecret === undefined) {
    delete process.env.NEXTAUTH_SECRET;
  } else {
    process.env.NEXTAUTH_SECRET = originalNextAuthSecret;
  }
  if (originalAuthSecret === undefined) {
    delete process.env.AUTH_SECRET;
  } else {
    process.env.AUTH_SECRET = originalAuthSecret;
  }
});

describe("validateRuntimeEnv", () => {
  it("reports missing DATABASE_URL and NEXTAUTH_SECRET", () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NEXTAUTH_SECRET", "");
    vi.stubEnv("AUTH_SECRET", "");

    const result = validateRuntimeEnv();

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual([
      "DATABASE_URL is not configured",
      "NEXTAUTH_SECRET is not configured",
    ]);
  });

  it("rejects a non-postgres DATABASE_URL and placeholder auth secret", () => {
    vi.stubEnv("DATABASE_URL", "mysql://localhost/hackvillage");
    vi.stubEnv("NEXTAUTH_SECRET", "replace-with-a-long-random-string");
    vi.stubEnv("AUTH_SECRET", "");

    const result = validateRuntimeEnv();

    expect(result.ok).toBe(false);
    expect(result.issues).toContain("DATABASE_URL must be a PostgreSQL connection string");
    expect(result.issues).toContain("NEXTAUTH_SECRET is not configured");
  });

  it("passes when postgres URL and auth secret are set", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://user:password@localhost:5432/hackvillage");
    vi.stubEnv("NEXTAUTH_SECRET", "a-long-random-secret");
    vi.stubEnv("AUTH_SECRET", "");

    const result = validateRuntimeEnv();

    expect(result).toEqual({ ok: true, issues: [] });
  });
});
