"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  { href: "/organizer/overview", label: "Overview" },
  { href: "/organizer/events", label: "My Events" },
] as const;

export function isOrganizerNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function OrganizerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <main className="org-shell">
      <aside className="org-sidebar" aria-label="Organizer navigation">
        <div className="org-brand-wrap">
          <p className="brand-sm">HackVillage</p>
          <h1 className="org-sidebar-title">Organizer Dashboard</h1>
          <p className="org-sidebar-subtitle">Escrow-safe events and outcomes</p>
        </div>

        <nav className="org-nav" aria-label="Dashboard sections">
          {NAV_ITEMS.map((item) => {
            const active = isOrganizerNavActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`org-nav-link ${active ? "org-nav-link-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <span className="org-nav-dot" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="org-profile" aria-label="Organizer profile">
          <p className="org-profile-label">Workspace</p>
          <p className="org-profile-name">Organizer Portal</p>
          <p className="org-profile-meta">Secure access required for mine=1 routes</p>
        </div>
      </aside>

      <section className="org-content">{children}</section>
    </main>
  );
}
