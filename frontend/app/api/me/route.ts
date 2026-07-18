import { AuthError, requireApiRole } from "@backend/lib/auth";
import { prisma } from "@backend/lib/db";
import {
  formatUserZodError,
  patchUserSchema,
} from "@backend/lib/validations/user.schema";
import { NextRequest, NextResponse } from "next/server";

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
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        githubHandle: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 },
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireApiRole("DEVELOPER");
    const body = await req.json();
    const parsed = patchUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(formatUserZodError(parsed.error), { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: session.userId },
      data: { githubHandle: parsed.data.github_handle },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        githubHandle: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    return errorResponse(error);
  }
}
