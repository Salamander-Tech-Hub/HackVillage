import type { EventStatus, OrganizerEvent, OrganizerOverview } from "@/lib/types";

export function toKnownStatus(status: EventStatus): string {
  return String(status).toUpperCase();
}

export function isCompletedStatus(status: EventStatus): boolean {
  const normalized = toKnownStatus(status);
  return normalized === "CLOSED" || normalized === "ARCHIVED";
}

export function summarizeOverview(events: OrganizerEvent[]): OrganizerOverview {
  let totalEvents = 0;
  let draftEvents = 0;
  let liveEvents = 0;
  let prizeVerifiedEvents = 0;
  let completedEvents = 0;
  let totalRegistrations = 0;

  for (const event of events) {
    totalEvents += 1;
    const status = toKnownStatus(event.status);
    if (status === "DRAFT") draftEvents += 1;
    if (status === "LIVE") liveEvents += 1;
    if (status === "PRIZE_VERIFIED") prizeVerifiedEvents += 1;
    if (isCompletedStatus(event.status)) completedEvents += 1;
    totalRegistrations += event.registrationsCount ?? 0;
  }

  return {
    totalEvents,
    draftEvents,
    liveEvents,
    prizeVerifiedEvents,
    completedEvents,
    totalRegistrations,
  };
}
