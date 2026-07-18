import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@backend/lib/auth";
import { prisma } from "@backend/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(req, "DEVELOPER");
    
    // Check and create if missing
    let profile = await prisma.developerProfile.findUnique({
      where: { userId: user.id },
    });
    
    if (!profile) {
      profile = await prisma.developerProfile.create({
        data: {
          userId: user.id,
          winCount: 0,
          eventCount: 0,
        },
      });
    }
    
    return NextResponse.json(profile);
  } catch (error: any) {
    if (error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: error.message } }, { status: 401 });
    }
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } }, { status: 500 });
  }
}
