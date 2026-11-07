"use client";

import { useEffect, useState, type FormEvent } from "react";

export function PayoutRecipientForm() {
  const [type, setType] = useState<"MPESA" | "BANK">("MPESA");
  const [account, setAccount] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [masked, setMasked] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/me/payout-recipient", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as {
          recipient?: { maskedAccount: string; displayName: string; type: "MPESA" | "BANK" };
        };
        if (payload.recipient) {
          setMasked(payload.recipient.maskedAccount);
          setDisplayName(payload.recipient.displayName);
          setType(payload.recipient.type);
        }
      })
      .catch(() => undefined);
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      setBusy(true);
      setMessage(null);
      const response = await fetch("/api/me/payout-recipient", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, account, displayName }),
      });
      const payload = (await response.json()) as {
        error?: { message?: string };
        recipient?: { maskedAccount: string };
      };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Unable to save recipient.");
      }
      setMasked(payload.recipient?.maskedAccount ?? null);
      setAccount("");
      setMessage("Payout destination saved. Only the masked account is stored for display.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save recipient.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="workspace-note org-form" onSubmit={(event) => void onSubmit(event)}>
      <h2 style={{ marginTop: 0 }}>Payout destination</h2>
      {masked ? <p>Current destination: {masked}</p> : <p>Add an M-Pesa or bank destination before you can be paid.</p>}
      <select className="org-input" value={type} onChange={(event) => setType(event.target.value as "MPESA" | "BANK")}>
        <option value="MPESA">M-Pesa</option>
        <option value="BANK">Bank</option>
      </select>
      <input
        className="org-input"
        placeholder="Account / phone number"
        value={account}
        onChange={(event) => setAccount(event.target.value)}
        required
      />
      <input
        className="org-input"
        placeholder="Account name"
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
        required
      />
      <button className="btn primary" type="submit" disabled={busy}>
        {busy ? "Saving..." : "Save destination"}
      </button>
      {message ? <p style={{ marginBottom: 0 }}>{message}</p> : null}
    </form>
  );
}
