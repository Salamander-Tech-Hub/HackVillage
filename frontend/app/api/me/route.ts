import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@backend/lib/auth";
import { patchUserSchema, formatZodError } from "@backend/lib/validations/user.schema";
import { prisma } from "@backend/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(req, "DEVELOPER");
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    
    if (!dbUser) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "User not found" } }, { status: 404 });
    }
    
    return NextResponse.json(dbUser);
  } catch (error: any) {
    if (error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: error.message } }, { status: 401 });
    }
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireRole(req, "DEVELOPER");
    const body = await req.json();
    
    const parsed = patchUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(formatZodError(parsed.error), { status: 400 });
    }

    const dbUser = await prisma.user.update({
      where: { id: user.id },
      data: { githubHandle: parsed.data.github_handle },
    });
    
    return NextResponse.json(dbUser);
  } catch (error: any) {
    if (error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: error.message } }, { status: 401 });
    }
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } }, { status: 500 });
  }
}
