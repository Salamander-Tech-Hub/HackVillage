import { createHmac, timingSafeEqual } from "node:crypto";

export const AUTH_COOKIE_NAME = "hackvillage_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

export type AppRole = "DEVELOPER" | "ORGANIZER" | "JUDGE" | "ADMIN";

export type AuthSession = {
  userId: string;
  email: string;
  name: string | null;
  role: AppRole;
  issuedAt: number;
  expiresAt: number;
};

const roles: readonly AppRole[] = ["DEVELOPER", "ORGANIZER", "JUDGE", "ADMIN"];

function toBase64Url(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function fromBase64Url(value: string): string | null {
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

function signature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function isSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== "object") return false;

  const session = value as Partial<AuthSession>;
  return (
    typeof session.userId === "string" &&
    typeof session.email === "string" &&
    (typeof session.name === "string" || session.name === null) &&
    typeof session.role === "string" &&
    roles.includes(session.role as AppRole) &&
    typeof session.issuedAt === "number" &&
    typeof session.expiresAt === "number"
  );
}

export function createSession(user: {
  id: string;
  email: string;
  name: string | null;
  role: AppRole;
}): AuthSession {
  const issuedAt = Math.floor(Date.now() / 1000);
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    issuedAt,
    expiresAt: issuedAt + SESSION_MAX_AGE_SECONDS,
  };
}

export function signSession(session: AuthSession, secret: string): string {
  const payload = toBase64Url(JSON.stringify(session));
  return `${payload}.${signature(payload, secret)}`;
}

export function verifySession(token: string | undefined, secret: string): AuthSession | null {
  if (!token) return null;

  const [payload, providedSignature, ...rest] = token.split(".");
  if (!payload || !providedSignature || rest.length > 0) return null;

  const expectedSignature = signature(payload, secret);
  const expectedBuffer = Buffer.from(expectedSignature);
  const providedBuffer = Buffer.from(providedSignature);

  if (
    expectedBuffer.length !== providedBuffer.length ||
    !timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    return null;
  }

  const rawSession = fromBase64Url(payload);
  if (!rawSession) return null;

  try {
    const parsed: unknown = JSON.parse(rawSession);
    if (!isSession(parsed) || parsed.expiresAt <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret || secret === "replace-with-a-long-random-string") {
    throw new Error("Set NEXTAUTH_SECRET (or AUTH_SECRET) before using authentication.");
  }
  return secret;
}
