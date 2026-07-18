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
      <div className="workspace-note"><b>Role check passed.</b> This route and its matching API are restricted to developers on the server.</div>
    </WorkspaceShell>
  );
}
