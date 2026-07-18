import { WorkspaceShell } from "@/components/workspace-shell";
import { requirePageRole } from "@/lib/access";

export const metadata = { title: "Organizer workspace" };

export default async function OrganizerPage() {
  const session = await requirePageRole("ORGANIZER");
  return (
    <WorkspaceShell
      session={session}
      eyebrow="Organizer workspace"
      title="Set the standard for your next event."
      description="Your event controls will appear here. Publishing remains gated by a verified prize vault."
    >
      <div className="workspace-note"><b>Role check passed.</b> This route and its matching API are restricted to organizers on the server.</div>
    </WorkspaceShell>
  );
}
