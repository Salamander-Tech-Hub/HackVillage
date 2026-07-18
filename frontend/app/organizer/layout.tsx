import type { Metadata } from "next";
import { OrganizerShell } from "@/components/organizer/OrganizerShell";
import { requirePageRole } from "@/lib/access";

export const metadata: Metadata = {
  title: "Organizer Dashboard",
  description:
    "Manage your HackVillage events, escrow status, and submissions in one place.",
};

export default async function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageRole("ORGANIZER");
  return <OrganizerShell>{children}</OrganizerShell>;
}
