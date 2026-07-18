import { WorkspaceShell } from "@/components/workspace-shell";
import { requirePageRole } from "@/lib/access";

export const metadata = { title: "Administrator workspace" };

export default async function AdminPage() {
  const session = await requirePageRole("ADMIN");
  return (
    <WorkspaceShell
      session={session}
      eyebrow="Administrator workspace"
      title="Keep the village running well."
      description="Platform-wide moderation and operational controls will live here as they are introduced."
    >
      <div className="workspace-note"><b>Role check passed.</b> Administrator access is enforced before this page and its API can respond.</div>
    </WorkspaceShell>
  );
}
