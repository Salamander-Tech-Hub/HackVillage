"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getEventLedger,
  getEventPayouts,
  getEventTransitions,
  retryEventPayout,
  type OrganizerLedgerEntry,
  type OrganizerPayout,
  type OrganizerTransition,
} from "@/lib/organizerApi";
import { ledgerKindLabel, transitionActionLabel } from "@/lib/organizerFlow";

const KES = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

const WHEN = new Intl.DateTimeFormat("en-KE", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

type ActivityState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ready";
      transitions: OrganizerTransition[];
      entries: OrganizerLedgerEntry[];
      publicLedgerUrl: string | null;
      payouts: OrganizerPayout[];
    };

function formatWhen(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Time unavailable" : WHEN.format(date);
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusClass(status: string) {
  switch (status.toUpperCase()) {
    case "SUCCESS":
      return "pill-good";
    case "FAILED":
      return "pill-bad";
    default:
      return "pill-warn";
  }
}

export function OrganizerActivityPanel({
  eventId,
  reloadToken,
}: {
  eventId: string;
  reloadToken: number;
}) {
  const [state, setState] = useState<ActivityState>({ kind: "loading" });
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const [transitions, ledger, payouts] = await Promise.all([
        getEventTransitions(eventId),
        getEventLedger(eventId),
        getEventPayouts(eventId),
      ]);
      setState({
        kind: "ready",
        transitions,
        entries: ledger.entries,
        publicLedgerUrl: ledger.publicLedgerUrl,
        payouts,
      });
      setRetryError(null);
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to load the event record.",
      });
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load, reloadToken, refreshToken]);

  async function retry(payoutId: string) {
    if (retryingId) return;
    setRetryingId(payoutId);
    setRetryError(null);
    try {
      await retryEventPayout(eventId, payoutId);
      setRefreshToken((value) => value + 1);
    } catch (error) {
      setRetryError(error instanceof Error ? error.message : "Unable to retry this payout.");
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <section className="org-detail-card" aria-label="Event financial and lifecycle records">
      <header className="org-detail-header">
        <div>
          <p className="brand-sm">Event record</p>
          <h2 className="judging-title">Payouts, ledger and lifecycle</h2>
          <p className="muted small">A traceable record of prize movement and event decisions.</p>
        </div>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => setRefreshToken((value) => value + 1)}
          disabled={state.kind === "loading" || retryingId !== null}
        >
          Refresh
        </button>
      </header>

      {state.kind === "loading" ? (
        <p className="muted" role="status">Loading event records…</p>
      ) : null}
      {state.kind === "error" ? (
        <div className="banner banner-warn" role="alert">
          <strong>Could not load event records.</strong> {state.message}
          <div className="org-inline-actions">
            <button type="button" className="btn" onClick={() => setRefreshToken((value) => value + 1)}>
              Try again
            </button>
          </div>
        </div>
      ) : null}

      {retryError ? <div className="banner banner-warn" role="alert">{retryError}</div> : null}

      {state.kind === "ready" ? (
        <div className="org-record-grid">
          <section aria-labelledby="event-payouts-title">
            <h3 className="org-record-title" id="event-payouts-title">Payouts</h3>
            {state.payouts.length === 0 ? (
              <p className="muted small">No payouts have been created for this event yet.</p>
            ) : (
              <ul className="org-record-list">
                {state.payouts.map((payout) => (
                  <li key={payout.id} className="org-record-item">
                    <div className="org-record-row">
                      <strong>{payout.submissionTitle ?? "Winning submission"}</strong>
                      <span className={`pill ${statusClass(payout.status)}`} aria-label={`Payout status: ${statusLabel(payout.status)}`}>
                        {statusLabel(payout.status)}
                      </span>
                    </div>
                    <p className="muted small">
                      {ledgerKindLabel(payout.phase)} · {KES.format(payout.amountKes)}
                    </p>
                    <p className="muted small">{formatWhen(payout.createdAt)}</p>
                    {payout.status === "FAILED" ? (
                      <div className="org-form-actions">
                        <button
                          type="button"
                          className="btn btn-sm"
                          disabled={retryingId !== null}
                          onClick={() => void retry(payout.id)}
                        >
                          {retryingId === payout.id ? "Retrying…" : "Retry payout"}
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="event-ledger-title">
            <h3 className="org-record-title" id="event-ledger-title">Ledger</h3>
            {state.entries.length === 0 ? (
              <p className="muted small">No deposits or releases have been recorded yet.</p>
            ) : (
              <ul className="org-record-list">
                {state.entries.map((entry) => (
                  <li key={entry.id} className="org-record-item">
                    <strong>{ledgerKindLabel(entry.kind)} · {KES.format(entry.amountKes)}</strong>
                    <p className="muted small">{formatWhen(entry.createdAt)}</p>
                    {entry.txHash ? (
                      <p className="muted small">
                        Reference: <code>{entry.txHash}</code>
                      </p>
                    ) : null}
                    {entry.publicUrl ? (
                      <a className="ledger-link" href={entry.publicUrl} target="_blank" rel="noopener noreferrer">
                        View public record ↗
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            {state.publicLedgerUrl ? (
              <p className="muted small">
                <a className="ledger-link" href={state.publicLedgerUrl} target="_blank" rel="noopener noreferrer">
                  Open event ledger ↗
                </a>
              </p>
            ) : null}
          </section>

          <section aria-labelledby="event-lifecycle-title">
            <h3 className="org-record-title" id="event-lifecycle-title">Lifecycle history</h3>
            {state.transitions.length === 0 ? (
              <p className="muted small">No lifecycle transitions have been recorded yet.</p>
            ) : (
              <ol className="org-record-list org-timeline">
                {state.transitions.map((step) => (
                  <li key={step.id} className="org-record-item">
                    <strong>{transitionActionLabel(step.action)}</strong>
                    <p className="muted small">
                      {statusLabel(step.fromStatus)} → {statusLabel(step.toStatus)}
                    </p>
                    <p className="muted small">{step.actorName} · {formatWhen(step.createdAt)}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      ) : null}
    </section>
  );
}
