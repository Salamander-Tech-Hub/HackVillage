"use client";

import { useState } from "react";
import { JudgeAvatar } from "@/components/organizer/JudgeAvatar";
import { closeEvent, OrganizerApiError } from "@/lib/organizerApi";
import type { JudgeReadinessItem, JudgingReadiness } from "@/lib/types";

interface JudgingProgressPanelProps {
  eventTitle: string;
  eventId: string;
  status: string;
  readiness: JudgingReadiness;
  onEventClosed: (updated: JudgingReadiness) => void;
  onRefresh: () => void;
}

type Tab = "judges" | "projects";

export function JudgingProgressPanel({
  eventTitle,
  eventId,
  status,
  readiness,
  onEventClosed,
  onRefresh,
}: JudgingProgressPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("judges");
  const [isClosing, setIsClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);

  const isClosed = status === "CLOSED" || status === "ARCHIVED";
  const pendingJudges = readiness.judges.filter((j) => !j.isComplete).length;

  async function handleCloseEvent() {
    if (!readiness.isReadyToClose || isClosing) return;
    if (!window.confirm(`Close "${eventTitle}"? Rankings will be frozen.`)) return;

    setIsClosing(true);
    setCloseError(null);
    try {
      onEventClosed(await closeEvent(eventId));
    } catch (err) {
      setCloseError(
        err instanceof OrganizerApiError || err instanceof Error
          ? err.message
          : "Failed to close event.",
      );
    } finally {
      setIsClosing(false);
    }
  }

  return (
    <section className="org-detail-card judging-panel" aria-label="Judging progress">
      <header className="org-detail-header">
        <div>
          <p className={`judging-live${isClosed ? " judging-live-off" : ""}`}>
            {isClosed ? "Judging finished" : "Judging in progress"}
          </p>
          <h2 className="judging-title">Judging progress</h2>
        </div>
        <button type="button" className="btn btn-sm" onClick={onRefresh}>
          Refresh
        </button>
      </header>

      <div className="kpi-grid">
        <div className="kpi">
          <p className="kpi-label">Active Judges</p>
          <p className="kpi-value">{readiness.totalJudges}</p>
          <p className="kpi-sub">
            {readiness.totalJudges > 0
              ? `${pendingJudges} with pending reviews`
              : "No judges assigned"}
          </p>
        </div>
        <div className="kpi">
          <p className="kpi-label">Submissions</p>
          <p className="kpi-value">{readiness.totalSubmissions}</p>
          <p className="kpi-sub">{readiness.totalReviewsRequired} reviews required</p>
        </div>
        <div className="kpi">
          <p className="kpi-label">Judging Pace</p>
          <p className="kpi-value">
            {readiness.totalReviewsCompleted} of {readiness.totalReviewsRequired}
          </p>
          <ProgressBar
            percent={readiness.percentage}
            label={`${readiness.percentage}% of reviews complete`}
          />
        </div>
      </div>

      {isClosed ? (
        <div className="banner judging-close judging-close-ready" role="status">
          <p className="judging-close-text">This event is closed. Reviews are final.</p>
        </div>
      ) : (
        <div
          className={`banner judging-close ${
            readiness.isReadyToClose ? "judging-close-ready" : "banner-warn"
          }`}
        >
          <div className="judging-close-text" id="close-event-reason">
            <strong>
              {readiness.isReadyToClose ? "Ready to close" : "Close event is blocked"}
            </strong>
            <p>
              {readiness.isReadyToClose
                ? "Every assigned judge has reviewed every submission."
                : readiness.missingReason ??
                  "Every assigned judge must review every submission before closing."}
            </p>
            {closeError ? (
              <p className="judging-error" role="alert">
                {closeError}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="btn primary"
            onClick={handleCloseEvent}
            disabled={!readiness.isReadyToClose || isClosing}
            aria-describedby="close-event-reason"
          >
            {isClosing ? "Closing…" : "Close Event"}
          </button>
        </div>
      )}

      <div className="judging-tabs" role="tablist" aria-label="Judging breakdown">
        <TabButton tab="judges" active={activeTab} onSelect={setActiveTab}>
          Judges ({readiness.judges.length})
        </TabButton>
        <TabButton tab="projects" active={activeTab} onSelect={setActiveTab}>
          Projects ({readiness.submissions.length})
        </TabButton>
      </div>

      <div role="tabpanel" id={`judging-tab-${activeTab}`}>
        {activeTab === "judges" ? (
          <JudgeList judges={readiness.judges} eventTitle={eventTitle} canNudge={!isClosed} />
        ) : (
          <ProjectList readiness={readiness} />
        )}
      </div>
    </section>
  );
}

function TabButton({
  tab,
  active,
  onSelect,
  children,
}: {
  tab: Tab;
  active: Tab;
  onSelect: (tab: Tab) => void;
  children: React.ReactNode;
}) {
  const selected = tab === active;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      aria-controls={`judging-tab-${tab}`}
      className={`chip${selected ? " chip-active" : ""}`}
      onClick={() => onSelect(tab)}
    >
      {children}
    </button>
  );
}

function JudgeList({
  judges,
  eventTitle,
  canNudge,
}: {
  judges: JudgeReadinessItem[];
  eventTitle: string;
  canNudge: boolean;
}) {
  if (judges.length === 0) {
    return <p className="muted">No judges assigned to this event.</p>;
  }

  return (
    <ul className="judging-list">
      {judges.map((judge) => {
        const percent = judge.total > 0 ? Math.round((judge.reviewed / judge.total) * 100) : 0;
        return (
          <li key={judge.judgeId} className="judging-row">
            <div className="judging-row-main">
              <JudgeAvatar name={judge.name} complete={judge.isComplete} />
              <div className="judging-row-meta">
                <p className="judging-row-name">{judge.name}</p>
                <p className="muted small">{judge.email}</p>
              </div>
              <span className={`pill ${judge.isComplete ? "pill-good" : "pill-warn"}`}>
                {judge.reviewed} / {judge.total} ({percent}%)
              </span>
              {canNudge && !judge.isComplete ? (
                <a
                  className="btn btn-sm"
                  href={nudgeHref(judge, eventTitle)}
                  aria-label={`Email ${judge.name} a reminder`}
                >
                  Nudge
                </a>
              ) : null}
            </div>
            <ProgressBar percent={percent} label={`${judge.name}: ${percent}% reviewed`} />
          </li>
        );
      })}
    </ul>
  );
}

function ProjectList({ readiness }: { readiness: JudgingReadiness }) {
  if (readiness.submissions.length === 0) {
    return <p className="muted">No submissions received for this event.</p>;
  }

  return (
    <ul className="judging-list">
      {readiness.submissions.map((submission) => (
        <li key={submission.submissionId} className="judging-row">
          <div className="judging-row-main">
            <div className="judging-row-meta">
              <p className="judging-row-name">{submission.title}</p>
              {submission.teamName ? (
                <p className="muted small">{submission.teamName}</p>
              ) : null}
            </div>
            <span className={`pill ${submission.isComplete ? "pill-good" : "pill-warn"}`}>
              {submission.reviewed}/{submission.total}{" "}
              {submission.isComplete ? "Scored" : "Complete"}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ProgressBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div
      className="judging-progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-label={label}
    >
      <div
        className={`judging-progress-fill${percent >= 100 ? " judging-progress-done" : ""}`}
        style={{ width: `${Math.min(100, percent)}%` }}
      />
    </div>
  );
}

function nudgeHref(judge: JudgeReadinessItem, eventTitle: string): string {
  const subject = `Reminder: ${judge.pending} pending ${
    judge.pending === 1 ? "review" : "reviews"
  } for ${eventTitle}`;
  const body = `Hi ${judge.name},\n\nYou have ${judge.pending} of ${judge.total} submissions left to review for ${eventTitle}. We can't close the event until every review is in.\n\nThank you!`;
  return `mailto:${judge.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
