"use client";

import { useState } from "react";
import { JudgeAvatar } from "@/components/organizer/JudgeAvatar";
import { assignJudge, OrganizerApiError, removeJudge } from "@/lib/organizerApi";
import type { JudgeReadinessItem, JudgingReadiness } from "@/lib/types";

interface JudgeAssignmentFormProps {
  eventId: string;
  judges: JudgeReadinessItem[];
  onChange: (readiness: JudgingReadiness) => void;
}

/** Judge roster editor. Only rendered before judging starts. */
export function JudgeAssignmentForm({ eventId, judges, onChange }: JudgeAssignmentFormProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAddJudge(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      onChange(await assignJudge(eventId, { email: trimmedEmail, name: name.trim() || undefined }));
      setEmail("");
      setName("");
    } catch (err) {
      setError(toMessage(err, "Failed to assign judge."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemoveJudge(judgeId: string) {
    setError(null);
    setRemovingId(judgeId);
    try {
      onChange(await removeJudge(eventId, judgeId));
    } catch (err) {
      setError(toMessage(err, "Failed to remove judge."));
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <section className="org-detail-card" aria-labelledby="judge-roster-title">
      <header className="org-detail-header">
        <div>
          <h2 className="judging-title" id="judge-roster-title">
            Judges
          </h2>
          <p className="muted small">
            Every assigned judge must review every submission before the event can close. The
            roster locks when judging starts.
          </p>
        </div>
      </header>

      {error ? (
        <div className="banner banner-warn judging-form-error" role="alert">
          {error}
        </div>
      ) : null}

      <form className="judge-form" onSubmit={handleAddJudge}>
        <label className="judge-form-field">
          <span className="kpi-label">Judge email</span>
          <input
            className="org-input"
            type="email"
            required
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
          />
        </label>
        <label className="judge-form-field">
          <span className="kpi-label">Name (optional)</span>
          <input
            className="org-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSubmitting}
          />
        </label>
        <button type="submit" className="btn primary" disabled={isSubmitting || !email.trim()}>
          {isSubmitting ? "Adding…" : "Add judge"}
        </button>
      </form>

      {judges.length === 0 ? (
        <p className="muted">No judges assigned yet.</p>
      ) : (
        <ul className="judging-list">
          {judges.map((judge) => (
            <li key={judge.judgeId} className="judging-row">
              <div className="judging-row-main">
                <JudgeAvatar name={judge.name} />
                <div className="judging-row-meta">
                  <p className="judging-row-name">{judge.name}</p>
                  <p className="muted small">{judge.email}</p>
                </div>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => handleRemoveJudge(judge.judgeId)}
                  disabled={removingId === judge.judgeId}
                  aria-label={`Remove judge ${judge.name}`}
                >
                  {removingId === judge.judgeId ? "Removing…" : "Remove"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function toMessage(err: unknown, fallback: string): string {
  return err instanceof OrganizerApiError || err instanceof Error ? err.message : fallback;
}
