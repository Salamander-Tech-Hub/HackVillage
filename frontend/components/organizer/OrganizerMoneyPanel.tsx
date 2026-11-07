"use client";

import { useState } from "react";

export function OrganizerMoneyPanel({
  eventId,
  status,
  paystackConfigured,
  onFunded,
}: {
  eventId: string;
  status: string;
  paystackConfigured: boolean;
  onFunded: () => void;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const canFund = status === "DRAFT" || status === "PENDING_ESCROW";

  async function post(path: string, body?: Record<string, unknown>) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(path, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const payload = (await response.json()) as {
        error?: { message?: string };
        authorizationUrl?: string | null;
        mode?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Request failed.");
      }
      if (payload.authorizationUrl) {
        window.location.href = payload.authorizationUrl;
        return;
      }
      if (payload.mode === "stub") {
        setMessage(
          "Stub mode. The prize pool is pending, and there is no Paystack redirect. Use Verify prize (test mode) to continue.",
        );
        onFunded();
        return;
      }
      setMessage("Saved.");
      onFunded();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="org-form">
      <h2 className="dashboard-title" style={{ fontSize: "1.4rem" }}>
        Escrow and payouts
      </h2>
      {canFund ? (
        <>
          <button
            type="button"
            className="btn primary"
            disabled={busy}
            onClick={() => void post(`/api/events/${encodeURIComponent(eventId)}/escrow/initialize`)}
          >
            {status === "PENDING_ESCROW" && paystackConfigured
              ? "Continue Paystack checkout"
              : "Fund prize pool"}
          </button>
          {status === "PENDING_ESCROW" && !paystackConfigured ? (
            <p className="muted small">
              Paystack is not configured. Verify prize (test mode) marks this vault funded for local development.
            </p>
          ) : null}
          {status === "PENDING_ESCROW" && paystackConfigured ? (
            <p className="muted small">
              Waiting for payment confirmation. This page updates when the Paystack webhook verifies the deposit.
            </p>
          ) : null}
        </>
      ) : null}
      {status === "CLOSED" && (
        <div className="org-form-actions">
          <button
            type="button"
            className="btn primary"
            disabled={busy}
            onClick={() =>
              void post(`/api/events/${encodeURIComponent(eventId)}/payouts`, { phase: "INSTANT_50" })
            }
          >
            Pay instant 50%
          </button>
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() =>
              void post(`/api/events/${encodeURIComponent(eventId)}/payouts`, { phase: "MILESTONE_50" })
            }
          >
            Pay milestone 50%
          </button>
        </div>
      )}
      {message ? <p className="muted">{message}</p> : null}
    </section>
  );
}
