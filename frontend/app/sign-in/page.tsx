import Link from "next/link";
import { dashboardPathFor, getSession, hasRole } from "@backend/lib/auth";
import { safeReturnPath } from "@/lib/access";
import { SignInForm } from "@/components/sign-in-form";
import { redirect } from "next/navigation";

type SignInPageProps = {
  searchParams: { next?: string };
};

export const metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const returnTo = safeReturnPath(searchParams.next);
  const session = await getSession().catch(() => null);

  if (session) {
    const isPermittedReturn =
      (returnTo?.startsWith("/organizer") && hasRole(session, "ORGANIZER")) ||
      (returnTo?.startsWith("/attendee") && hasRole(session, "DEVELOPER")) ||
      (returnTo?.startsWith("/developer") && hasRole(session, "DEVELOPER")) ||
      (returnTo?.startsWith("/judge") && hasRole(session, "JUDGE")) ||
      (returnTo?.startsWith("/admin") && hasRole(session, "ADMIN"));
    redirect(isPermittedReturn && returnTo ? returnTo : dashboardPathFor(session.role));
  }

  return (
    <main className="auth-page">
      <a className="skip-link" href="#sign-in-form">Skip to sign in</a>
      <section className="auth-story" aria-label="HackVillage overview">
        <Link className="auth-brand" href="/">HackVillage<span aria-hidden="true">.</span></Link>
        <div className="auth-story-content">
          <p className="auth-kicker">The event trust layer</p>
          <h1>Good work deserves a clear path forward.</h1>
          <p>
            Prize-backed events, structured feedback, and proof that outlives the closing ceremony.
          </p>
        </div>
        <div className="trust-markers" aria-label="HackVillage principles">
          <span><b>01</b> Prize verification</span>
          <span><b>02</b> Public proof of work</span>
          <span><b>03</b> Career momentum</span>
        </div>
      </section>
      <section className="auth-panel" id="sign-in-form">
        <div className="auth-panel-heading">
          <p className="auth-kicker">Your workspace</p>
          <h2>Welcome back</h2>
          <p>Sign in to access the work your role is trusted to do.</p>
        </div>
        <SignInForm returnTo={returnTo} />
        <p className="auth-footnote">
          Your role controls what you can open. <Link href="/events">Browse verified events</Link> without signing in.
        </p>
      </section>
    </main>
  );
}
