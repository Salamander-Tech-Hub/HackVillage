"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getOrganizerOverview, OrganizerApiError } from "@/lib/organizerApi";
import type { OrganizerOverview } from "@/lib/types";
import { OrganizerEmptyState } from "@/components/organizer/OrganizerEmptyState";

type OverviewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: OrganizerOverview };

export default function OrganizerOverviewPage() {
  const [state, setState] = useState<OverviewState>({ kind: "loading" });

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const data = await getOrganizerOverview();
      setState({ kind: "ready", data });
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
          <p className="lede">
            Track event performance and rollout readiness at a glance.
          </p>
        </div>
        <div className="dashboard-header-actions">
          <Link className="btn" href="/organizer/events">
            View all events
          </Link>
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
            <button type="button" className="btn" onClick={() => void load()}>
              Retry
            </button>
          </div>
        </div>
      ) : null}

      {state.kind === "ready" && state.data.totalEvents === 0 ? (
        <OrganizerEmptyState
          title="No events yet"
          description="Your dashboard will populate once your first event is created."
        />
      ) : null}

      {state.kind === "ready" && state.data.totalEvents > 0 ? (
        <section className="kpi-grid" aria-label="Overview statistics">
          <Kpi label="Total events" value={state.data.totalEvents} />
          <Kpi label="Draft events" value={state.data.draftEvents} />
          <Kpi label="Live events" value={state.data.liveEvents} />
          <Kpi label="Prize verified" value={state.data.prizeVerifiedEvents} />
          <Kpi label="Completed" value={state.data.completedEvents} />
          <Kpi label="Registrations" value={state.data.totalRegistrations} />
        </section>
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
