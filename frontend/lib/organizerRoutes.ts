import type { OrganizerEvent } from "@/lib/types";

export function toOrganizerEventHref(event: OrganizerEvent): string {
  return `/organizer/events/${encodeURIComponent(event.id)}`;
}

export function isOrganizerNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
