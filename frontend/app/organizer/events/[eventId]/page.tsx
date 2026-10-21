"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EventStatusPill } from "@/components/StatusPill";
import { JudgeAssignmentForm } from "@/components/organizer/JudgeAssignmentForm";
import { JudgingProgressPanel } from "@/components/organizer/JudgingProgressPanel";
import {
  OrganizerApiError,
  getJudgingProgress,
  getOrganizerEventById,
} from "@/lib/organizerApi";
import type { JudgingReadiness, OrganizerEvent } from "@/lib/types";

type DetailState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ready";
      event: OrganizerEvent;
      judgingReadiness: JudgingReadiness | null;
    };

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

export default function OrganizerEventDetailPage({
  params,
}: {
  params: { eventId: string };
}) {
  const [state, setState] = useState<DetailState>({ kind: "loading" });

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      // Judging data is secondary: a failure there still renders the event.
      const [event, judgingReadiness] = await Promise.all([
        getOrganizerEventById(params.eventId),
        getJudgingProgress(params.eventId).catch(() => null),
      ]);
      setState({ kind: "ready", event, judgingReadiness });
    } catch (error) {
      const message =
        error instanceof OrganizerApiError
          ? `${error.message} (${error.status})`
          : "Unable to load event details.";
      setState({ kind: "error", message });
    }
  }, [params.eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function refreshJudging() {
    try {
      applyJudging(await getJudgingProgress(params.eventId));
    } catch {
      // Keep the last known progress; the next refresh can try again.
    }
  }

  function applyJudging(judgingReadiness: JudgingReadiness) {
    setState((prev) =>
      prev.kind === "ready"
        ? {
            ...prev,
            judgingReadiness,
            event: { ...prev.event, status: judgingReadiness.status },
          }
        : prev,
    );
  }

  return (
    <section className="org-panel" aria-live="polite">
      <div className="org-inline-actions">
        <Link className="btn" href="/organizer/events">
          ← Back to My Events
        </Link>
      </div>

      {state.kind === "loading" ? (
        <div className="kpi-grid" aria-busy="true">
          <div className="kpi skeleton-card" />
          <div className="kpi skeleton-card" />
          <div className="kpi skeleton-card" />
        </div>
      ) : null}

      {state.kind === "error" ? (
        <div className="banner banner-warn" role="alert">
          <strong>Could not load event details.</strong> {state.message}
          <div className="org-inline-actions">
            <button type="button" className="btn" onClick={() => void load()}>
              Retry
            </button>
          </div>
        </div>
      ) : null}

      {state.kind === "ready" ? (
        <>
          <EventDetails event={state.event} />
          <JudgingSection
            event={state.event}
            readiness={state.judgingReadiness}
            onChange={applyJudging}
            onRefresh={() => void refreshJudging()}
          />
        </>
      ) : null}
    </section>
  );
}

const ROSTER_LOCKED_STATUSES = ["JUDGING", "CLOSED", "ARCHIVED"];

function JudgingSection({
  event,
  readiness,
  onChange,
  onRefresh,
}: {
  event: OrganizerEvent;
  readiness: JudgingReadiness | null;
  onChange: (readiness: JudgingReadiness) => void;
  onRefresh: () => void;
}) {
  if (!readiness) {
    return (
      <div className="banner banner-warn" role="alert">
        Judging details could not be loaded.{" "}
        <button type="button" className="btn btn-sm" onClick={onRefresh}>
          Retry
        </button>
      </div>
    );
  }

  if (!ROSTER_LOCKED_STATUSES.includes(event.status)) {
    return (
      <JudgeAssignmentForm eventId={event.id} judges={readiness.judges} onChange={onChange} />
    );
  }

  return (
    <JudgingProgressPanel
      eventId={event.id}
      eventTitle={event.title}
      status={event.status}
      readiness={readiness}
      onEventClosed={onChange}
      onRefresh={onRefresh}
    />
  );
}

function EventDetails({ event }: { event: OrganizerEvent }) {
  return (
    <article className="org-detail-card">
      <header className="org-detail-header">
        <div>
          <p className="brand-sm">Organizer Event</p>
          <h1 className="dashboard-title">{event.title}</h1>
          <p className="muted">{event.problemStatement ?? "No description provided yet."}</p>
        </div>
        <EventStatusPill status={event.status} />
      </header>

      <dl className="org-detail-grid">
        <Info label="Dates" value={formatDateRange(event.startsAt, event.endsAt)} />
        <Info label="Location" value={event.location ?? "N/A"} />
        <Info label="Format" value={formatFormat(event.format)} />
        <Info label="Prize Pool" value={KES.format(event.prizePoolKes)} />
        <Info
          label="Registrations"
          value={event.registrationsCount?.toString() ?? "N/A"}
        />
        <Info
          label="Submissions"
          value={event.submissionsCount.toLocaleString("en-KE")}
        />
        <Info
          label="Last Updated"
          value={event.updatedAt ? DATE_FMT.format(new Date(event.updatedAt)) : "N/A"}
        />
      </dl>
    </article>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="org-detail-item">
      <dt className="kpi-label">{label}</dt>
      <dd className="kpi-value org-detail-value">{value}</dd>
    </div>
  );
}

function formatDateRange(startsAt: string | null, endsAt: string | null) {
  if (!startsAt) return "Not scheduled";
  const start = DATE_FMT.format(new Date(startsAt));
  if (!endsAt) return start;
  return `${start} → ${DATE_FMT.format(new Date(endsAt))}`;
}

function formatFormat(format: OrganizerEvent["format"]) {
  if (format === "IN_PERSON") return "In person";
  if (format === "VIRTUAL") return "Virtual";
  if (format === "HYBRID") return "Hybrid";
  return "N/A";
}
