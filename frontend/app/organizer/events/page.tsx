"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EventStatusPill } from "@/components/StatusPill";
import { OrganizerEmptyState } from "@/components/organizer/OrganizerEmptyState";
import { getMyEvents, OrganizerApiError } from "@/lib/organizerApi";
import { toOrganizerEventHref } from "@/lib/organizerRoutes";
import type { OrganizerEvent } from "@/lib/types";

type EventsState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; events: OrganizerEvent[] };

const KES = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

const DATE_FMT = new Intl.DateTimeFormat("en-KE", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default function OrganizerEventsPage() {
  const [state, setState] = useState<EventsState>({ kind: "loading" });

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const response = await getMyEvents();
      setState({ kind: "ready", events: response.events });
    } catch (error) {
      const message =
        error instanceof OrganizerApiError
          ? `${error.message} (${error.status})`
          : "Unable to load organizer events.";
      setState({ kind: "error", message });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="org-panel" aria-live="polite">
      <header className="dashboard-header">
        <div>
          <p className="brand-sm">Organizer</p>
          <h1 className="dashboard-title">My Events</h1>
          <p className="lede">Events owned by your organizer account.</p>
        </div>
      </header>

      {state.kind === "loading" ? <SkeletonTable /> : null}

      {state.kind === "error" ? (
        <div className="banner banner-warn" role="alert">
          <strong>Could not load events.</strong> {state.message}
          <div className="org-inline-actions">
            <button type="button" className="btn" onClick={() => void load()}>
              Retry
            </button>
          </div>
        </div>
      ) : null}

      {state.kind === "ready" && state.events.length === 0 ? (
        <OrganizerEmptyState
          title="No events yet"
          description="You have not created any events under this organizer account."
        />
      ) : null}

      {state.kind === "ready" && state.events.length > 0 ? (
        <div className="table-wrap" role="region" aria-label="Organizer events table">
          <table className="events-table">
            <thead>
              <tr>
                <th scope="col">Event</th>
                <th scope="col">Status</th>
                <th scope="col">Date</th>
                <th scope="col">Location / Format</th>
                <th scope="col">Registrations</th>
                <th scope="col">Prize</th>
                <th scope="col">Updated</th>
                <th scope="col" className="col-actions">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {state.events.map((event) => (
                <tr key={event.id} className="org-row">
                  <td>
                    <div className="event-title event-title-wrap">{event.title}</div>
                    <div className="event-slug muted small">{event.slug ?? event.id}</div>
                  </td>
                  <td>
                    <EventStatusPill status={event.status} />
                  </td>
                  <td>{formatDateRange(event.startsAt, event.endsAt)}</td>
                  <td>{formatLocation(event.location, event.format)}</td>
                  <td className="num">{event.registrationsCount ?? "N/A"}</td>
                  <td className="num">{KES.format(event.prizePoolKes)}</td>
                  <td>{event.updatedAt ? DATE_FMT.format(new Date(event.updatedAt)) : "N/A"}</td>
                  <td className="col-actions">
                    <Link className="btn btn-sm" href={toOrganizerEventHref(event)}>
                      View event
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function formatDateRange(startsAt: string | null, endsAt: string | null) {
  if (!startsAt) return "Not scheduled";
  const start = DATE_FMT.format(new Date(startsAt));
  if (!endsAt) return start;
  return `${start} → ${DATE_FMT.format(new Date(endsAt))}`;
}

function formatLocation(location: string | null, format: OrganizerEvent["format"]) {
  const formatLabel = format
    ? format === "IN_PERSON"
      ? "In person"
      : format === "VIRTUAL"
        ? "Virtual"
        : "Hybrid"
    : null;

  if (!location && !formatLabel) return "N/A";
  if (!location) return formatLabel;
  if (!formatLabel) return location;
  return `${location} · ${formatLabel}`;
}

function SkeletonTable() {
  return (
    <div className="table-wrap" aria-busy="true" aria-live="polite">
      <div className="skeleton-row" />
      <div className="skeleton-row" />
      <div className="skeleton-row" />
      <div className="skeleton-row" />
    </div>
  );
}
