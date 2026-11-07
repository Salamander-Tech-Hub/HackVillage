import { PrismaClient } from "@prisma/client";
import { getDatabaseUrl } from "@backend/lib/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export type DatabaseCheck = {
  ok: boolean;
  error?: string;
};

export async function checkDatabase(): Promise<DatabaseCheck> {
  if (!getDatabaseUrl()) {
    return { ok: false, error: "DATABASE_URL is not configured" };
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch {
    return { ok: false, error: "Database unavailable" };
  }
}
