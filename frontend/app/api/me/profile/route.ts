import { AuthError, requireApiRole } from "@backend/lib/auth";
import { prisma } from "@backend/lib/db";
import { NextResponse } from "next/server";

function errorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.code === "UNAUTHORIZED" ? 401 : 403 },
    );
  }
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
    { status: 500 },
  );
}

export async function GET() {
  try {
    const session = await requireApiRole("DEVELOPER");

    const profile = await prisma.developerProfile.upsert({
      where: { userId: session.userId },
      update: {},
      create: {
        userId: session.userId,
        winCount: 0,
        eventCount: 0,
      },
    });

    return NextResponse.json(profile);
  } catch (error) {
    return errorResponse(error);
  }
}
