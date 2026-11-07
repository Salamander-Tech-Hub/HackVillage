"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  getJudgeQueue,
  listJudgeAssignments,
  saveFeedback,
  type JudgeAssignment,
  type JudgeQueue,
} from "@/lib/judgeApi";

export function JudgeWorkspace() {
  const [events, setEvents] = useState<JudgeAssignment[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [queue, setQueue] = useState<JudgeQueue | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    try {
      const payload = await listJudgeAssignments();
      setEvents(payload.events);
      setSelectedId((current) => current ?? payload.events[0]?.id ?? null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load assignments.");
    }
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (!selectedId) {
      setQueue(null);
      return;
    }
    getJudgeQueue(selectedId)
      .then(setQueue)
      .catch((err) => {
        setQueue(null);
        setError(err instanceof Error ? err.message : "Unable to load judging queue.");
      });
  }, [selectedId]);

  if (error && events.length === 0) {
    return (
      <div className="workspace-note">
        <b>Could not load assignments.</b> {error}
      </div>
    );
  }

  if (events.length === 0) {
    return <div className="workspace-note">You have not been assigned to any events yet.</div>;
  }

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <div className="actions" style={{ flexWrap: "wrap" }}>
        {events.map((event) => (
          <button
            key={event.id}
            type="button"
            className={event.id === selectedId ? "btn primary" : "btn"}
            onClick={() => setSelectedId(event.id)}
          >
            {event.title} ({event.submissionCount})
          </button>
        ))}
      </div>
      {queue ? <JudgeQueueCard queue={queue} onSaved={() => selectedId && getJudgeQueue(selectedId).then(setQueue)} /> : null}
    </div>
  );
}

function JudgeQueueCard({
  queue,
  onSaved,
}: {
  queue: JudgeQueue;
  onSaved: () => void;
}) {
  return (
    <section>
      <div className="workspace-note">
        <h2 style={{ marginTop: 0 }}>{queue.event.title}</h2>
        <p>{queue.readiness.reason}</p>
      </div>
      {queue.submissions.length === 0 ? (
        <div className="workspace-note">No submissions are ready for review yet.</div>
      ) : (
        queue.submissions.map((submission) => (
          <FeedbackForm key={submission.id} submission={submission} onSaved={onSaved} />
        ))
      )}
    </section>
  );
}

function FeedbackForm({
  submission,
  onSaved,
}: {
  submission: JudgeQueue["submissions"][number];
  onSaved: () => void;
}) {
  const [points, setPoints] = useState(
    submission.feedback?.points.join("\n") ?? "",
  );
  const [score, setScore] = useState(
    submission.feedback?.score ? String(submission.feedback.score) : "",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      setBusy(true);
      setMessage(null);
      await saveFeedback(submission.id, {
        points: points.split("\n"),
        score: score ? Number(score) : null,
      });
      onSaved();
      setMessage("Feedback saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save feedback.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="workspace-note org-form" onSubmit={(event) => void onSubmit(event)}>
      <h3 style={{ marginTop: 0 }}>{submission.title}</h3>
      <p>Team: {submission.teamName}</p>
      <textarea
        className="org-input org-textarea"
        rows={5}
        value={points}
        onChange={(event) => setPoints(event.target.value)}
        placeholder={"One feedback point per line\nNeed at least three"}
        disabled={busy}
      />
      <input
        className="org-input"
        type="number"
        min={1}
        max={10}
        placeholder="Score 1-10 (optional)"
        value={score}
        onChange={(event) => setScore(event.target.value)}
        disabled={busy}
      />
      <button type="submit" className="btn primary" disabled={busy}>
        {busy ? "Saving..." : "Save feedback"}
      </button>
      {message ? <p style={{ marginBottom: 0 }}>{message}</p> : null}
    </form>
  );
}
