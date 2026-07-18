import { getSession, hasRole, type AppRole } from "@backend/lib/auth";
import { redirect } from "next/navigation";

export function safeReturnPath(value: string | undefined): string | null {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : null;
}

export async function requirePageRole(...roles: AppRole[]) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (!hasRole(session, ...roles)) {
    redirect(`/access-denied?required=${roles[0].toLowerCase()}`);
  }
  return session;
}
