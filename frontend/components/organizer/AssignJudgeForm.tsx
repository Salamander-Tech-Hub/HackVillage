"use client";

import { useEffect, useState, type FormEvent } from "react";
import { assignJudge, listEventJudges } from "@/lib/judgeApi";

export function AssignJudgeForm({ eventId }: { eventId: string }) {
  const [email, setEmail] = useState("judge@hackvillage.local");
  const [judges, setJudges] = useState<{ judgeEmail: string; judgeName: string | null }[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listEventJudges(eventId)
      .then((payload) => setJudges(payload.judges))
      .catch(() => setJudges([]));
  }, [eventId]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      setBusy(true);
      setMessage(null);
      await assignJudge(eventId, email);
      const payload = await listEventJudges(eventId);
      setJudges(payload.judges);
      setMessage("Judge assigned.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to assign judge.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="org-form" onSubmit={(event) => void onSubmit(event)}>
      <h2 className="dashboard-title" style={{ fontSize: "1.4rem" }}>
        Judges
      </h2>
      {judges.length === 0 ? (
        <p className="muted">No judges assigned yet.</p>
      ) : (
        <ul>
          {judges.map((judge) => (
            <li key={judge.judgeEmail}>
              {judge.judgeName ?? judge.judgeEmail} · {judge.judgeEmail}
            </li>
          ))}
        </ul>
      )}
      <input
        className="org-input"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="judge@hackvillage.local"
        disabled={busy}
        required
      />
      <button type="submit" className="btn" disabled={busy}>
        {busy ? "Assigning..." : "Assign judge"}
      </button>
      {message ? <p className="muted">{message}</p> : null}
    </form>
  );
}
