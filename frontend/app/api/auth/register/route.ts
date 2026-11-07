import { prisma } from "@backend/lib/db";
import { dashboardPathFor } from "@backend/lib/auth";
import { hashPassword } from "@backend/lib/password";
import { attachSessionCookie } from "@backend/lib/session";
import { NextResponse } from "next/server";

type RegisterPayload = {
  email?: unknown;
  password?: unknown;
  name?: unknown;
};

export async function POST(request: Request) {
  let payload: RegisterPayload;
  try {
    payload = (await request.json()) as RegisterPayload;
  } catch {
    return NextResponse.json({ error: "Enter your name, email, and password." }, { status: 400 });
  }

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const password = typeof payload.password === "string" ? payload.password : "";
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  if (!email || !password || !name) {
    return NextResponse.json({ error: "Enter your name, email, and password." }, { status: 400 });
  }

  try {
    const passwordHash = await hashPassword(password);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        email,
        name,
        role: "DEVELOPER",
        passwordHash,
      },
      select: { id: true, email: true, name: true, role: true },
    });

    const response = NextResponse.json({ redirectTo: dashboardPathFor(user.role) }, { status: 201 });
    attachSessionCookie(response, user);
    return response;
  } catch (error) {
    if (error instanceof Error && error.message.includes("at least 8")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Registration is unavailable right now." }, { status: 503 });
  }
}
