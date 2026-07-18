import { WorkspaceShell } from "@/components/workspace-shell";
import { requirePageRole } from "@/lib/access";

export const metadata = { title: "Judge workspace" };

export default async function JudgePage() {
  const session = await requirePageRole("JUDGE");
  return (
    <WorkspaceShell
      session={session}
      eyebrow="Judge workspace"
      title="Make every review useful."
      description="Your assigned events, rubric, and feedback queue will appear here when judging opens."
    >
      <div className="workspace-note"><b>Role check passed.</b> This route is reserved for trusted judges and verified again by route handlers.</div>
    </WorkspaceShell>
  );
}
