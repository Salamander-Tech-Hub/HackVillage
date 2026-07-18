import type { OrganizerEvent } from "@/lib/types";

export function toOrganizerEventHref(event: OrganizerEvent): string {
  return `/organizer/events/${encodeURIComponent(event.id)}`;
}
