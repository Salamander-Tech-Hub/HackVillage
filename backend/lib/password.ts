import { promisify } from "node:util";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

export function assertPasswordStrength(password: string): void {
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
}

export async function hashPassword(password: string): Promise<string> {
  assertPasswordStrength(password);
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, salt, hash] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !hash) {
    return false;
  }

  const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  const expected = Buffer.from(hash, "hex");
  if (derived.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(derived, expected);
}
