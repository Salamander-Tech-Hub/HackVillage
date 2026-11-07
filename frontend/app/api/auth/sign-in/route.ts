import { dashboardPathFor } from "@backend/lib/auth";
import { authenticateUser } from "@backend/lib/credentials";
import { attachSessionCookie } from "@backend/lib/session";
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

  try {
    const user = await authenticateUser(email, password);
    if (!user) {
      return NextResponse.json(
        { error: "Those details do not match an account." },
        { status: 401 },
      );
    }

    const redirectTo = safeReturnPath(payload.returnTo) ?? dashboardPathFor(user.role);
    const response = NextResponse.json({ redirectTo });
    attachSessionCookie(response, user);
    return response;
  } catch (error) {
    console.error("Sign-in failed", error);
    return NextResponse.json(
      { error: "Sign-in is not configured yet. Add a database URL and auth secret, then try again." },
      { status: 503 },
    );
  }
}
