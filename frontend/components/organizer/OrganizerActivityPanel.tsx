"use client";

import { Children, useCallback, useEffect, useState, type ReactNode } from "react";
import {
  getEventLedger,
  getEventPayouts,
  getEventTransitions,
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

export function OrganizerActivityPanel({
  eventId,
  reloadToken,
}: {
  eventId: string;
  reloadToken: number;
}) {
  const [state, setState] = useState<ActivityState>({ kind: "loading" });

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
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to load the event record.",
      });
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load, reloadToken]);

  return (
    <section className="org-detail-card" aria-label="Event record">
      <header className="org-detail-header">
        <div>
          <p className="brand-sm">Record</p>
          <h2 className="judging-title">History, ledger, and payouts</h2>
        </div>
        <button type="button" className="btn btn-sm" onClick={() => void load()}>
          Refresh
        </button>
      </header>

      {state.kind === "loading" ? <p className="muted">Loading the event record...</p> : null}
      {state.kind === "error" ? (
        <div className="banner banner-warn" role="alert">
          <strong>Could not load the event record.</strong> {state.message}
        </div>
      ) : null}

      {state.kind === "ready" ? (
        <div className="org-record-grid">
          <RecordList title="Lifecycle" empty="No steps yet. Fund the prize pool to begin.">
            {state.transitions.map((step) => (
              <li key={step.id}>
                <strong>{transitionActionLabel(step.action)}</strong>
                <p className="muted small">
                  {step.fromStatus.replace(/_/g, " ")} → {step.toStatus.replace(/_/g, " ")} ·{" "}
                  {step.actorName} · {WHEN.format(new Date(step.createdAt))}
                </p>
              </li>
            ))}
          </RecordList>

          <RecordList title="Ledger" empty="No ledger entries yet.">
            {state.entries.map((entry) => (
              <li key={entry.id}>
                <strong>
                  {ledgerKindLabel(entry.kind)} · {KES.format(entry.amountKes)}
                </strong>
                <p className="muted small">
                  {WHEN.format(new Date(entry.createdAt))}
                  {entry.publicUrl ? (
                    <>
                      {" "}
                      ·{" "}
                      <a className="ledger-link" href={entry.publicUrl} target="_blank" rel="noreferrer">
                        Public record
                      </a>
                    </>
                  ) : null}
                </p>
              </li>
            ))}
          </RecordList>

          <RecordList title="Payouts" empty="Payouts appear after the event is closed and winners are paid.">
            {state.payouts.map((payout) => (
              <li key={payout.id}>
                <strong>
                  {ledgerKindLabel(payout.phase)} · {KES.format(payout.amountKes)} · {payout.status}
                </strong>
                <p className="muted small">
                  {payout.submissionTitle ?? "Winning submission"} · {WHEN.format(new Date(payout.createdAt))}
                </p>
              </li>
            ))}
          </RecordList>
        </div>
      ) : null}

      {state.kind === "ready" && state.publicLedgerUrl ? (
        <p className="muted small">
          Vault ledger:{" "}
          <a className="ledger-link" href={state.publicLedgerUrl} target="_blank" rel="noreferrer">
            {state.publicLedgerUrl}
          </a>
        </p>
      ) : null}
    </section>
  );
}

function RecordList({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h3 className="org-record-title">{title}</h3>
      {Children.count(children) === 0 ? (
        <p className="muted small">{empty}</p>
      ) : (
        <ul className="org-record-list">{children}</ul>
      )}
    </div>
  );
}
