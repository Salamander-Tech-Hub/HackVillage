import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@backend/lib/db", () => ({
  checkDatabase: vi.fn(),
}));

vi.mock("@backend/lib/env", () => ({
  validateRuntimeEnv: vi.fn(),
}));

import { checkDatabase } from "@backend/lib/db";
import { validateRuntimeEnv } from "@backend/lib/env";
import { GET } from "../../frontend/app/api/health/route";

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test("returns 200 when env and database checks pass", async () => {
    vi.mocked(validateRuntimeEnv).mockReturnValue({ ok: true, issues: [] });
    vi.mocked(checkDatabase).mockResolvedValue({ ok: true });

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.checks.env.ok).toBe(true);
    expect(data.checks.database.ok).toBe(true);
  });

  test("returns 503 when the database is unavailable", async () => {
    vi.mocked(validateRuntimeEnv).mockReturnValue({ ok: true, issues: [] });
    vi.mocked(checkDatabase).mockResolvedValue({
      ok: false,
      error: "Database unavailable",
    });

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data.ok).toBe(false);
    expect(data.checks.database.error).toBe("Database unavailable");
  });

  test("returns 503 when required runtime env is missing", async () => {
    vi.mocked(validateRuntimeEnv).mockReturnValue({
      ok: false,
      issues: ["DATABASE_URL is not configured"],
    });
    vi.mocked(checkDatabase).mockResolvedValue({
      ok: false,
      error: "DATABASE_URL is not configured",
    });

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data.ok).toBe(false);
    expect(data.checks.env.issues).toContain("DATABASE_URL is not configured");
  });
});
