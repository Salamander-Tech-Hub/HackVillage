import Link from "next/link";
import { dashboardPathFor, getSession, roleLabel } from "@backend/lib/auth";

type AccessDeniedProps = {
  searchParams: { required?: string };
};

export const metadata = { title: "Access restricted" };

export default async function AccessDeniedPage({ searchParams }: AccessDeniedProps) {
  const session = await getSession().catch(() => null);
  const required = searchParams.required ? `${searchParams.required} workspace` : "this workspace";

  return (
    <main className="state-page">
      <Link className="state-brand" href="/">HackVillage<span aria-hidden="true">.</span></Link>
      <div className="state-number" aria-hidden="true">403</div>
      <p className="auth-kicker">Access is role-scoped</p>
      <h1>This account cannot open {required}.</h1>
      <p>
        {session
          ? `You are signed in as ${roleLabel(session.role)}. Switch to an account with the right role, or continue to your workspace.`
          : "Sign in with the account that has the right role for this workspace."}
      </p>
      <div className="state-actions">
        <Link className="state-primary" href={session ? dashboardPathFor(session.role) : "/sign-in"}>
          {session ? "Go to my workspace" : "Sign in"}
        </Link>
        <Link className="state-secondary" href="/events">Browse verified events</Link>
      </div>
    </main>
  );
}
