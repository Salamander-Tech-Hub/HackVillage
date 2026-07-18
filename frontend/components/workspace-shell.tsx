import Link from "next/link";
import { type AuthSession, roleLabel } from "@backend/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";

type WorkspaceShellProps = {
  session: AuthSession;
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

export function WorkspaceShell({
  session,
  eyebrow,
  title,
  description,
  children,
}: WorkspaceShellProps) {
  return (
    <main className="workspace-page">
      <header className="workspace-header">
        <Link className="workspace-brand" href="/">HackVillage</Link>
        <div className="workspace-user">
          <span>{session.name ?? session.email}</span>
          <span className="role-pill">{roleLabel(session.role)}</span>
          <SignOutButton />
        </div>
      </header>
      <section className="workspace-intro" aria-labelledby="workspace-title">
        <p>{eyebrow}</p>
        <h1 id="workspace-title">{title}</h1>
        <p>{description}</p>
      </section>
      <section className="workspace-content">{children}</section>
    </main>
  );
}
