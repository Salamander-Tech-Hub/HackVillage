import { NextRequest, NextResponse } from "next/server";

type MiddlewareRole = "DEVELOPER" | "ORGANIZER" | "JUDGE" | "ADMIN";

type EdgeSession = {
  role: MiddlewareRole;
  expiresAt: number;
};

const requirements: Array<{ prefix: string; role: MiddlewareRole }> = [
  { prefix: "/organizer", role: "ORGANIZER" },
  { prefix: "/attendee", role: "DEVELOPER" },
  { prefix: "/developer", role: "DEVELOPER" },
  { prefix: "/judge", role: "JUDGE" },
  { prefix: "/admin", role: "ADMIN" },
];

function encode(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function decodeBase64Url(value: string): string | null {
  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    return decodeURIComponent(
      Array.from(atob(base64), (character) => `%${character.charCodeAt(0).toString(16).padStart(2, "0")}`).join(""),
    );
  } catch {
    return null;
  }
}

function toBase64Url(bytes: ArrayBuffer): string {
  const binary = Array.from(new Uint8Array(bytes), (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function constantTimeEquals(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}

async function readSession(token: string | undefined): Promise<EdgeSession | null> {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!token || !secret) return null;
  const [payload, providedSignature, ...rest] = token.split(".");
  if (!payload || !providedSignature || rest.length > 0) return null;

  const key = await crypto.subtle.importKey(
    "raw",
    encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expectedSignature = toBase64Url(await crypto.subtle.sign("HMAC", key, encode(payload)));
  if (!constantTimeEquals(expectedSignature, providedSignature)) return null;

  const raw = decodeBase64Url(payload);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<EdgeSession>;
    if (
      !parsed.role ||
      !["DEVELOPER", "ORGANIZER", "JUDGE", "ADMIN"].includes(parsed.role) ||
      typeof parsed.expiresAt !== "number" ||
      parsed.expiresAt <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return parsed as EdgeSession;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const requirement = requirements.find(({ prefix }) => request.nextUrl.pathname.startsWith(prefix));
  if (!requirement) return NextResponse.next();

  const session = await readSession(request.cookies.get("hackvillage_session")?.value);
  if (!session) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }
  if (session.role !== "ADMIN" && session.role !== requirement.role) {
    const deniedUrl = new URL("/access-denied", request.url);
    deniedUrl.searchParams.set("required", requirement.role.toLowerCase());
    return NextResponse.redirect(deniedUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/organizer/:path*", "/attendee/:path*", "/developer/:path*", "/judge/:path*", "/admin/:path*"],
};
