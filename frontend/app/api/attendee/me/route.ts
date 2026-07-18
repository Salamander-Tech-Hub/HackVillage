import { getSession, hasRole } from "@backend/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
    if (!hasRole(session, "DEVELOPER")) {
      return NextResponse.json(
        { error: "Your account cannot access attendee data." },
        { status: 403 },
      );
    }
    return NextResponse.json({ user: session });
  } catch {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  }
}
