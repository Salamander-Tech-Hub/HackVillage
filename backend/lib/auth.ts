import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import {
  AUTH_COOKIE_NAME,
  type AppRole,
  type AuthSession,
  getAuthSecret,
  verifySession,
} from "@backend/lib/session";

export { AUTH_COOKIE_NAME, type AppRole, type AuthSession } from "@backend/lib/session";

export function dashboardPathFor(role: AppRole): string {
  switch (role) {
    case "ORGANIZER":
      return "/organizer";
    case "JUDGE":
      return "/judge";
    case "ADMIN":
      return "/admin";
    default:
      return "/attendee";
  }
}

export function roleLabel(role: AppRole): string {
  return {
    DEVELOPER: "Developer",
    ORGANIZER: "Organizer",
    JUDGE: "Judge",
    ADMIN: "Administrator",
  }[role];
}

export async function getSession(): Promise<AuthSession | null> {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  return verifySession(token, getAuthSecret());
}

export function hasRole(session: AuthSession | null, ...roles: AppRole[]): boolean {
  return Boolean(session && (roles.includes(session.role) || session.role === "ADMIN"));
}

export function getDemoPassword(): string | null {
  if (process.env.DEMO_AUTH_PASSWORD) return process.env.DEMO_AUTH_PASSWORD;
  return process.env.NODE_ENV === "production" ? null : "hackvillage-demo";
}

export function verifyDemoPassword(candidate: string): boolean {
  const password = getDemoPassword();
  if (!password) return false;

  const expected = Buffer.from(password);
  const provided = Buffer.from(candidate);
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}
