import type { Metadata } from "next";
import { OrganizerShell } from "@/components/organizer/OrganizerShell";

export const metadata: Metadata = {
  title: "Organizer Dashboard",
  description:
    "Manage your HackVillage events, escrow status, and submissions in one place.",
};

export default function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <OrganizerShell>{children}</OrganizerShell>;
}
