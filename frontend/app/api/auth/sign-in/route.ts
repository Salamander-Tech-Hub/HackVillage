import { prisma } from "@backend/lib/db";
import {
  AUTH_COOKIE_NAME,
  createSession,
  getAuthSecret,
  SESSION_MAX_AGE_SECONDS,
  signSession,
} from "@backend/lib/session";
import {
  dashboardPathFor,
  verifyDemoPassword,
} from "@backend/lib/auth";
import { NextResponse } from "next/server";

type SignInPayload = {
  email?: unknown;
  password?: unknown;
  returnTo?: unknown;
};

function safeReturnPath(value: unknown): string | null {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : null;
}

export async function POST(request: Request) {
  let payload: SignInPayload;
  try {
    payload = (await request.json()) as SignInPayload;
  } catch {
    return NextResponse.json({ error: "Please enter your email address and password." }, { status: 400 });
  }

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const password = typeof payload.password === "string" ? payload.password : "";
  if (!email || !password) {
    return NextResponse.json(
      { error: "Please enter your email address and password." },
      { status: 400 },
    );
  }

  if (!verifyDemoPassword(password)) {
    return NextResponse.json(
      { error: "Those details do not match a local demo account. Try a demo workspace below." },
      { status: 401 },
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, role: true },
    });
    if (!user) {
      return NextResponse.json(
        { error: "Those details do not match a local demo account. Try a demo workspace below." },
        { status: 401 },
      );
    }

    const token = signSession(createSession(user), getAuthSecret());
    const redirectTo = safeReturnPath(payload.returnTo) ?? dashboardPathFor(user.role);
    const response = NextResponse.json({ redirectTo });
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return response;
  } catch (error) {
    console.error("Sign-in failed", error);
    return NextResponse.json(
      { error: "Sign-in is not configured yet. Add a database URL and auth secret, then try again." },
      { status: 503 },
    );
  }
}
