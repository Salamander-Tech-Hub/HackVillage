"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { AssignJudgeForm } from "@/components/organizer/AssignJudgeForm";
import { JudgingProgressPanel } from "@/components/organizer/JudgingProgressPanel";
import { OrganizerActivityPanel } from "@/components/organizer/OrganizerActivityPanel";
import { OrganizerMoneyPanel } from "@/components/organizer/OrganizerMoneyPanel";
import { ParticipantsPanel } from "@/components/organizer/ParticipantsPanel";
import { EventStatusPill } from "@/components/StatusPill";
import {
  OrganizerApiError,
  getOrganizerEventById,
  transitionEvent,
  type OrganizerJudgingProgress,
} from "@/lib/organizerApi";
import { nextOrganizerStep } from "@/lib/organizerFlow";
import type { LifecycleAction, OrganizerEvent } from "@/lib/types";

type DetailState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; event: OrganizerEvent };

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

const ACTION_COPY: Record<
  LifecycleAction,
  { label: string; hint: string; primary?: boolean }
> = {
  START_ESCROW: {
    label: "Start escrow",
    hint: "Locks the draft and opens a pending prize vault.",
    primary: true,
  },
  VERIFY_ESCROW: {
    label: "Verify prize (test mode)",
    hint: "Stub verification until Paystack webhooks are connected.",
    primary: true,
  },
  PUBLISH: {
    label: "Publish event",
    hint: "Makes the event live after prize verification.",
    primary: true,
  },
  START_JUDGING: {
    label: "Start judging",
    hint: "Closes live submissions and opens judging.",
  },
  CLOSE: {
    label: "Close event",
    hint: "Marks judging complete and freezes the event.",
  },
  ARCHIVE: {
    label: "Archive event",
    hint: "Hides a closed event from the active organizer list.",
  },
};

export default function OrganizerEventDetailPage({
  params,
}: {
  params: { eventId: string };
}) {
  return (
    <Suspense
      fallback={
        <section className="org-panel" aria-busy="true">
          <div className="kpi-grid">
            <div className="kpi skeleton-card" />
            <div className="kpi skeleton-card" />
            <div className="kpi skeleton-card" />
          </div>
        </section>
      }
    >
      <OrganizerEventDetail params={params} />
    </Suspense>
  );
}

function OrganizerEventDetail({
  params,
}: {
  params: { eventId: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const waitingForDeposit = searchParams.get("deposit") === "pending";
  const [state, setState] = useState<DetailState>({ kind: "loading" });
  const [progress, setProgress] = useState<OrganizerJudgingProgress | null>(null);
  const [recordToken, setRecordToken] = useState(0);
  const rememberProgress = useCallback((next: OrganizerJudgingProgress | null) => {
    setProgress(next);
  }, []);

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const event = await getOrganizerEventById(params.eventId);
      setState({ kind: "ready", event });
    } catch (error) {
      const message =
        error instanceof OrganizerApiError
          ? `${error.message} (${error.status})`
          : "Unable to load event details.";
      setState({ kind: "error", message });
    }
  }, [params.eventId]);

  const refresh = useCallback(async () => {
    try {
      const event = await getOrganizerEventById(params.eventId);
      setState({ kind: "ready", event });
      setRecordToken((token) => token + 1);
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

  useEffect(() => {
    if (!waitingForDeposit || state.kind !== "ready") return;
    if (state.event.status !== "PENDING_ESCROW") {
      router.replace(`/organizer/events/${encodeURIComponent(params.eventId)}`);
      return;
    }
    const timer = window.setInterval(() => {
      void refresh();
    }, 4000);
    return () => window.clearInterval(timer);
  }, [params.eventId, refresh, router, state, waitingForDeposit]);

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

      {state.kind === "ready" &&
      waitingForDeposit &&
      state.event.status === "PENDING_ESCROW" ? (
        <div className="banner" role="status">
          <strong>Waiting for payment confirmation.</strong> Paystack has not verified the prize deposit yet. This page refreshes automatically.
        </div>
      ) : null}

      {state.kind === "ready" ? (
        <>
          <EventDetails
            event={state.event}
            progress={progress}
            onEventChange={(event) => {
              setState({ kind: "ready", event });
              setRecordToken((token) => token + 1);
            }}
          />
          {state.event.status === "JUDGING" ||
          state.event.status === "CLOSED" ||
          state.event.status === "ARCHIVED" ? (
            <JudgingProgressPanel
              eventId={state.event.id}
              eventTitle={state.event.title}
              status={String(state.event.status)}
              onEventChange={(event) => {
              setState({ kind: "ready", event });
              setRecordToken((token) => token + 1);
            }}
              onProgress={rememberProgress}
            />
          ) : null}
          {state.event.status !== "DRAFT" && state.event.status !== "PENDING_ESCROW" ? (
            <ParticipantsPanel eventId={state.event.id} status={String(state.event.status)} />
          ) : null}
          <OrganizerMoneyPanel
            eventId={state.event.id}
            status={String(state.event.status)}
            paystackConfigured={state.event.paystackConfigured === true}
            onFunded={() => void refresh()}
          />
          <OrganizerActivityPanel eventId={state.event.id} reloadToken={recordToken} />
          {state.event.status !== "DRAFT" ? (
            <AssignJudgeForm eventId={state.event.id} />
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function EventDetails({
  event,
  progress,
  onEventChange,
}: {
  event: OrganizerEvent;
  progress: OrganizerJudgingProgress | null;
  onEventChange: (event: OrganizerEvent) => void;
}) {
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<LifecycleAction | null>(null);
  const panelOwnsClose = event.status === "JUDGING" && progress !== null;
  const actions = (event.allowedActions ?? []).filter(
    (action) => !(panelOwnsClose && action === "CLOSE"),
  );

  async function runAction(action: LifecycleAction) {
    if (pendingAction) return;
    try {
      setPendingAction(action);
      setActionError(null);
      const updated = await transitionEvent(event.id, action);
      onEventChange(updated);
    } catch (error) {
      setActionError(
        error instanceof OrganizerApiError
          ? error.message
          : "Unable to update the event status.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <article className="org-detail-card">
      <header className="org-detail-header">
        <div>
          <p className="brand-sm">Organizer Event</p>
          <h1 className="dashboard-title">{event.title}</h1>
          <p className="muted">{event.problemStatement ?? "No description provided yet."}</p>
          <p className="muted small">{nextOrganizerStep(String(event.status), event.paystackConfigured === true)}</p>
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
          label="Escrow"
          value={event.escrow ? `${event.escrow.state.replace(/_/g, " ")} · ${KES.format(event.escrow.amountKes)}` : "Not started"}
        />
        <Info
          label="Last Updated"
          value={event.updatedAt ? DATE_FMT.format(new Date(event.updatedAt)) : "N/A"}
        />
      </dl>

      {event.escrow?.publicLedgerUrl ? (
        <p className="muted small">
          Ledger:{" "}
          <a className="ledger-link" href={event.escrow.publicLedgerUrl} target="_blank" rel="noreferrer">
            {event.escrow.publicLedgerUrl}
          </a>
        </p>
      ) : null}

      <div className="org-form-actions">
        {event.status === "DRAFT" ? (
          <Link className="btn" href={`/organizer/events/${encodeURIComponent(event.id)}/edit`}>
            Edit draft
          </Link>
        ) : null}
        {actions.map((action) => {
          const copy = ACTION_COPY[action];
          return (
            <button
              key={action}
              type="button"
              className={copy.primary ? "btn primary" : "btn"}
              disabled={pendingAction !== null}
              onClick={() => void runAction(action)}
            >
              {pendingAction === action ? "Updating..." : copy.label}
            </button>
          );
        })}
      </div>

      {actions.length > 0 ? (
        <p className="muted small">
          {actions.map((action) => ACTION_COPY[action].hint).join(" ")}
        </p>
      ) : event.status === "DRAFT" || event.status === "PENDING_ESCROW" ? null : (
        <p className="muted small">No further organizer transitions are available.</p>
      )}

      {actionError ? (
        <div className="banner banner-warn" role="alert">
          <strong>Transition blocked.</strong> {actionError}
        </div>
      ) : null}
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
