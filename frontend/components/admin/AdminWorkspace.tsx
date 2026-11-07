"use client";

import { useCallback, useEffect, useState } from "react";

type AdminPayload = {
  overview: {
    users: number;
    events: number;
    payouts: number;
    failedPayouts: number;
    webhookEvents: number;
  };
  audit: { id: string; action: string; actorEmail: string; targetId: string; createdAt: string }[];
  failedPayouts: { id: string; eventId: string; phase: string; amountKes: number }[];
  transitions: { id: string; action: string; eventTitle: string; fromStatus: string; toStatus: string }[];
};

export function AdminWorkspace() {
  const [data, setData] = useState<AdminPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/overview", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Unable to load administrator data.");
      }
      setData((await response.json()) as AdminPayload);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load administrator data.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function retry(payoutId: string) {
    setMessage(null);
    const response = await fetch(`/api/admin/payouts/${encodeURIComponent(payoutId)}/retry`, {
      method: "POST",
      credentials: "same-origin",
    });
    if (!response.ok) {
      setMessage("Retry failed.");
      return;
    }
    setMessage("Payout retry recorded.");
    await load();
  }

  if (error) {
    return <div className="workspace-note">{error}</div>;
  }
  if (!data) {
    return <div className="workspace-note">Loading operations data...</div>;
  }

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <section className="kpi-grid">
        <article className="kpi"><p className="kpi-label">Users</p><p className="kpi-value">{data.overview.users}</p></article>
        <article className="kpi"><p className="kpi-label">Events</p><p className="kpi-value">{data.overview.events}</p></article>
        <article className="kpi"><p className="kpi-label">Payouts</p><p className="kpi-value">{data.overview.payouts}</p></article>
        <article className="kpi"><p className="kpi-label">Failed payouts</p><p className="kpi-value">{data.overview.failedPayouts}</p></article>
      </section>

      <section className="workspace-note">
        <h2 style={{ marginTop: 0 }}>Failed payouts</h2>
        {data.failedPayouts.length === 0 ? <p>None.</p> : data.failedPayouts.map((payout) => (
          <div key={payout.id} className="org-form-actions">
            <span>{payout.phase} · {payout.amountKes} KES · {payout.eventId}</span>
            <button type="button" className="btn" onClick={() => void retry(payout.id)}>
              Retry
            </button>
          </div>
        ))}
      </section>

      <section className="workspace-note">
        <h2 style={{ marginTop: 0 }}>Recent transitions</h2>
        {data.transitions.map((row) => (
          <p key={row.id}>{row.eventTitle}: {row.fromStatus} → {row.toStatus} ({row.action})</p>
        ))}
      </section>

      <section className="workspace-note">
        <h2 style={{ marginTop: 0 }}>Admin audit</h2>
        {data.audit.length === 0 ? <p>No recovery actions yet.</p> : data.audit.map((row) => (
          <p key={row.id}>{row.actorEmail} · {row.action} · {row.targetId}</p>
        ))}
      </section>
      {message ? <p>{message}</p> : null}
    </div>
  );
}
