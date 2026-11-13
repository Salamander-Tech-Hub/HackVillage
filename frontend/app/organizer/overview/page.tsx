"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  getEventPayouts,
  getMyEvents,
  getOrganizerOverview,
  OrganizerApiError,
  type OrganizerPayout,
} from "@/lib/organizerApi";
import type { OrganizerEvent, OrganizerOverview } from "@/lib/types";
import { OrganizerEmptyState } from "@/components/organizer/OrganizerEmptyState";

type AttentionItem = {
  event: OrganizerEvent;
  kind: "deposit" | "judging" | "payout";
  detail: string;
};

type OverviewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: OrganizerOverview; attention: AttentionItem[] };

async function buildNeedsAttention(events: OrganizerEvent[]): Promise<AttentionItem[]> {
  const items: AttentionItem[] = [];

  for (const event of events) {
    if (event.status === "PENDING_ESCROW") {
      items.push({ event, kind: "deposit", detail: "Prize deposit needs confirmation." });
    } else if (event.status === "JUDGING") {
      items.push({ event, kind: "judging", detail: "Judging is in progress." });
    } else if (event.status === "CLOSED") {
      try {
        const payouts = await getEventPayouts(event.id);
        const incomplete = payouts.filter((payout: OrganizerPayout) => payout.status !== "SUCCESS");
        if (incomplete.length > 0) {
          const failed = incomplete.filter((payout) => payout.status === "FAILED").length;
          items.push({
            event,
            kind: "payout",
            detail: failed > 0
              ? `${failed} payout${failed === 1 ? "" : "s"} failed and need retry.`
              : `${incomplete.length} payout${incomplete.length === 1 ? "" : "s"} awaiting completion.`,
          });
        } else if (payouts.length === 0) {
          items.push({ event, kind: "payout", detail: "Winner payouts have not been started." });
        }
      } catch {
        items.push({ event, kind: "payout", detail: "Payout status could not be checked." });
      }
    }
  }

  return items;
}

export default function OrganizerOverviewPage() {
  const [state, setState] = useState<OverviewState>({ kind: "loading" });

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const [data, eventList] = await Promise.all([getOrganizerOverview(), getMyEvents()]);
      const attention = await buildNeedsAttention(eventList.events);
      setState({ kind: "ready", data, attention });
    } catch (error) {
      const message =
        error instanceof OrganizerApiError
          ? `${error.message} (${error.status})`
          : "Unable to load organizer overview.";
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
          <h1 className="dashboard-title">Overview</h1>
          <p className="lede">Track event performance and rollout readiness at a glance.</p>
        </div>
        <div className="dashboard-header-actions">
          <Link className="btn" href="/organizer/events">View all events</Link>
          <Link className="btn primary" href="/organizer/events/new">Create event</Link>
        </div>
      </header>

      {state.kind === "loading" ? (
        <div className="kpi-grid" aria-busy="true">
          <div className="kpi skeleton-card" />
          <div className="kpi skeleton-card" />
          <div className="kpi skeleton-card" />
          <div className="kpi skeleton-card" />
          <div className="kpi skeleton-card" />
          <div className="kpi skeleton-card" />
        </div>
      ) : null}

      {state.kind === "error" ? (
        <div className="banner banner-warn" role="alert">
          <strong>Could not load overview.</strong> {state.message}
          <div className="org-inline-actions">
            <button type="button" className="btn" onClick={() => void load()}>Retry</button>
          </div>
        </div>
      ) : null}

      {state.kind === "ready" && state.data.totalEvents === 0 ? (
        <OrganizerEmptyState
          title="No events yet"
          description="Your dashboard will populate once your first event is created."
          createEventHref="/organizer/events/new"
        />
      ) : null}

      {state.kind === "ready" && state.data.totalEvents > 0 ? (
        <>
          <section className="kpi-grid" aria-label="Overview statistics">
            <Kpi label="Total events" value={state.data.totalEvents} />
            <Kpi label="Draft events" value={state.data.draftEvents} />
            <Kpi label="Live events" value={state.data.liveEvents} />
            <Kpi label="Prize verified" value={state.data.prizeVerifiedEvents} />
            <Kpi label="Completed" value={state.data.completedEvents} />
            <Kpi label="Registrations" value={state.data.totalRegistrations} />
          </section>

          <section className="org-detail-card" aria-labelledby="needs-attention-title">
            <header className="org-detail-header">
              <div>
                <p className="brand-sm">Follow-up</p>
                <h2 className="judging-title" id="needs-attention-title">Needs attention</h2>
                <p className="muted small">Events with a deposit, judging, or payout step still in progress.</p>
              </div>
              <span className="pill pill-warn">{state.attention.length} open</span>
            </header>

            {state.attention.length === 0 ? (
              <p className="muted">Nothing needs attention right now. Your event records are up to date.</p>
            ) : (
              <ul className="org-record-list">
                {state.attention.map((item) => (
                  <li key={`${item.event.id}-${item.kind}`} className="org-record-item">
                    <div className="org-record-row">
                      <strong>{item.event.title}</strong>
                      <span className="pill pill-warn">{item.kind === "deposit" ? "Deposit" : item.kind === "judging" ? "Judging" : "Payouts"}</span>
                    </div>
                    <p className="muted small">{item.detail}</p>
                    <Link className="ledger-link" href={`/organizer/events/${encodeURIComponent(item.event.id)}`}>
                      Open event record →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </section>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <article className="kpi">
      <p className="kpi-label">{label}</p>
      <p className="kpi-value">{value.toLocaleString("en-KE")}</p>
    </article>
  );
}
