import Link from "next/link";
import { ProfileStub } from "@/components/ProfileStub";
import { WorkspaceShell } from "@/components/workspace-shell";
import { requirePageRole } from "@/lib/access";

export const metadata = { title: "Attendee workspace" };

export default async function AttendeePage() {
  const session = await requirePageRole("DEVELOPER");

  return (
    <WorkspaceShell
      session={session}
      eyebrow="Developer workspace"
      title="Turn each event into proof of work."
      description="Your teams, submissions, and verified feedback will appear here as you build your event history."
    >
      <section style={{ display: "grid", gap: "1.5rem" }}>
        <div>
          <h2 style={{ marginTop: 0 }}>Upcoming registered events</h2>
          <div className="workspace-note">
            You have not registered for any upcoming events yet. Browse public events and form a
            team when registration opens.
          </div>
          <div className="actions" style={{ marginTop: "1rem" }}>
            <Link className="btn primary" href="/events">
              Browse events
            </Link>
          </div>
        </div>

        <div>
          <h2>Profile stub</h2>
          <ProfileStub />
        </div>
      </section>
    </WorkspaceShell>
  );
}
