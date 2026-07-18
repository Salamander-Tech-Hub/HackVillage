import { describe, expect, it } from "vitest";
import { createSession, signSession, verifySession } from "@backend/lib/session";

const secret = "test-secret-that-is-long-enough";

describe("signed authentication sessions", () => {
  it("round-trips a valid signed session", () => {
    const session = createSession({
      id: "user_123",
      email: "organizer@hackvillage.local",
      name: "Demo Organizer",
      role: "ORGANIZER",
    });

    expect(verifySession(signSession(session, secret), secret)).toMatchObject({
      userId: "user_123",
      email: "organizer@hackvillage.local",
      role: "ORGANIZER",
    });
  });

  it("rejects a token whose payload was altered", () => {
    const session = createSession({
      id: "user_123",
      email: "dev@hackvillage.local",
      name: "Demo Developer",
      role: "DEVELOPER",
    });
    const token = signSession(session, secret);
    const [payload, signature] = token.split(".");
    const altered = `${payload.slice(0, -1)}x.${signature}`;

    expect(verifySession(altered, secret)).toBeNull();
  });

  it("rejects expired sessions even when correctly signed", () => {
    const expired = {
      ...createSession({
        id: "user_123",
        email: "judge@hackvillage.local",
        name: "Demo Judge",
        role: "JUDGE" as const,
      }),
      issuedAt: 1,
      expiresAt: 2,
    };

    expect(verifySession(signSession(expired, secret), secret)).toBeNull();
  });
});
