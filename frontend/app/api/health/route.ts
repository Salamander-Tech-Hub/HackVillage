import { checkDatabase } from "@backend/lib/db";
import { validateRuntimeEnv } from "@backend/lib/env";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const env = validateRuntimeEnv();
  const database = await checkDatabase();
  const ok = env.ok && database.ok;

  return NextResponse.json(
    {
      ok,
      service: "hackvillage",
      version: "0.1.0",
      checks: {
        env,
        database,
      },
    },
    { status: ok ? 200 : 503 },
  );
}
