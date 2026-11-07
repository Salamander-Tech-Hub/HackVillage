import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@backend/lib/auth", () => ({
  AuthError: class AuthError extends Error {
    code: "UNAUTHORIZED" | "FORBIDDEN";
    constructor(code: "UNAUTHORIZED" | "FORBIDDEN", message: string) {
      super(message);
      this.code = code;
    }
  },
  requireApiRole: vi.fn(),
}));

vi.mock("@backend/services/admin/admin.service", () => ({
  getAdminOverview: vi.fn(),
  listAdminAudit: vi.fn(),
  listFailedPayouts: vi.fn(),
  listRecentTransitions: vi.fn(),
  recoverPayout: vi.fn(),
}));

import { AuthError, requireApiRole } from "@backend/lib/auth";
import * as adminService from "@backend/services/admin/admin.service";
import { GET } from "../../frontend/app/api/admin/overview/route";
import { POST } from "../../frontend/app/api/admin/payouts/[payoutId]/retry/route";

const adminSession = {
  userId: "admin-1",
  email: "admin@hackvillage.local",
  name: "Demo Administrator",
  role: "ADMIN" as const,
  issuedAt: 1,
  expiresAt: 999999,
};

describe("Admin API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test("overview requires an administrator", async () => {
    vi.mocked(requireApiRole).mockRejectedValue(
      new AuthError("FORBIDDEN", "You do not have permission for this action."),
    );
    const res = await GET();
    expect(res.status).toBe(403);
  });

  test("overview returns operational totals", async () => {
    vi.mocked(requireApiRole).mockResolvedValue(adminSession);
    vi.mocked(adminService.getAdminOverview).mockResolvedValue({
      users: 5,
      events: 2,
      payouts: 1,
      failedPayouts: 0,
      webhookEvents: 3,
    });
    vi.mocked(adminService.listAdminAudit).mockResolvedValue([]);
    vi.mocked(adminService.listFailedPayouts).mockResolvedValue([]);
    vi.mocked(adminService.listRecentTransitions).mockResolvedValue([]);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.overview.users).toBe(5);
  });

  test("retry writes through the recovery service", async () => {
    vi.mocked(requireApiRole).mockResolvedValue(adminSession);
    vi.mocked(adminService.recoverPayout).mockResolvedValue({
      id: "pay-1",
      status: "SUCCESS",
      transferCode: "stub",
    });
    const res = await POST(new Request("http://localhost/api/admin/payouts/pay-1/retry"), {
      params: { payoutId: "pay-1" },
    });
    expect(res.status).toBe(200);
    expect(adminService.recoverPayout).toHaveBeenCalledWith("admin-1", "pay-1");
  });
});
