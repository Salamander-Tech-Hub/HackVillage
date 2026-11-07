"use client";

import { useCallback, useEffect, useState } from "react";
import { JudgeAvatar } from "@/components/organizer/JudgeAvatar";
import {
  getJudgingProgress,
  OrganizerApiError,
  transitionEvent,
  type OrganizerJudgingProgress,
} from "@/lib/organizerApi";
import type { OrganizerEvent } from "@/lib/types";

type Tab = "judges" | "projects";

export function JudgingProgressPanel({
  eventId,
  eventTitle,
  status,
  onEventChange,
  onProgress,
}: {
  eventId: string;
  eventTitle: string;
  status: string;
  onEventChange: (event: OrganizerEvent) => void;
  onProgress: (progress: OrganizerJudgingProgress | null) => void;
}) {
  const [progress, setProgress] = useState<OrganizerJudgingProgress | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("judges");

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      const next = await getJudgingProgress(eventId);
      setProgress(next);
      onProgress(next);
    } catch (error) {
      setProgress(null);
      onProgress(null);
      setLoadError(error instanceof Error ? error.message : "Unable to load judging progress.");
    }
  }, [eventId, onProgress]);

  useEffect(() => {
    void load();
  }, [load]);

  const isClosed = status === "CLOSED" || status === "ARCHIVED";

  async function handleClose() {
    if (!progress?.isReadyToClose || isClosing) return;
    if (!window.confirm(`Close "${eventTitle}"? Rankings will be frozen.`)) return;
    try {
      setIsClosing(true);
      setCloseError(null);
      onEventChange(await transitionEvent(eventId, "CLOSE"));
    } catch (error) {
      setCloseError(
        error instanceof OrganizerApiError
          ? error.message
          : "Unable to close the event.",
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
        <button type="button" className="btn btn-sm" onClick={() => void load()}>
          Refresh
        </button>
      </header>

      {loadError ? (
        <div className="banner banner-warn" role="alert">
          <strong>Could not load judging progress.</strong> {loadError}
        </div>
      ) : null}

      {progress ? (
        <>
          <div className="kpi-grid">
            <div className="kpi">
              <p className="kpi-label">Active Judges</p>
              <p className="kpi-value">{progress.totalJudges}</p>
              <p className="kpi-sub">
                {progress.totalJudges > 0
                  ? `${progress.judges.filter((judge) => !judge.isComplete).length} with pending reviews`
                  : "No judges assigned"}
              </p>
            </div>
            <div className="kpi">
              <p className="kpi-label">Submissions</p>
              <p className="kpi-value">{progress.totalSubmissions}</p>
              <p className="kpi-sub">{progress.totalReviewsRequired} reviews required</p>
            </div>
            <div className="kpi">
              <p className="kpi-label">Judging Pace</p>
              <p className="kpi-value">
                {progress.totalReviewsCompleted} of {progress.totalReviewsRequired}
              </p>
              <ProgressBar
                percent={progress.percentage}
                label={`${progress.percentage}% of reviews complete`}
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
                progress.isReadyToClose ? "judging-close-ready" : "banner-warn"
              }`}
            >
              <div className="judging-close-text" id="close-event-reason">
                <strong>{progress.isReadyToClose ? "Ready to close" : "Close event is blocked"}</strong>
                <p>
                  {progress.isReadyToClose
                    ? progress.totalSubmissions === 0
                      ? "No submissions to review."
                      : "Every assigned judge has submitted at least three feedback points on every submission."
                    : progress.missingReason}
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
                onClick={() => void handleClose()}
                disabled={!progress.isReadyToClose || isClosing}
                aria-describedby="close-event-reason"
              >
                {isClosing ? "Closing..." : "Close event"}
              </button>
            </div>
          )}

          <div className="judging-tabs" role="tablist" aria-label="Judging breakdown">
            <TabButton tab="judges" active={activeTab} onSelect={setActiveTab}>
              Judges ({progress.judges.length})
            </TabButton>
            <TabButton tab="projects" active={activeTab} onSelect={setActiveTab}>
              Projects ({progress.submissions.length})
            </TabButton>
          </div>

          <div role="tabpanel" id={`judging-tab-${activeTab}`}>
            {activeTab === "judges" ? (
              <JudgeList
                judges={progress.judges}
                eventTitle={eventTitle}
                canNudge={!isClosed}
              />
            ) : (
              <ProjectList progress={progress} />
            )}
          </div>
        </>
      ) : null}
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
  judges: OrganizerJudgingProgress["judges"];
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

function ProjectList({ progress }: { progress: OrganizerJudgingProgress }) {
  if (progress.submissions.length === 0) {
    return <p className="muted">No submissions received for this event.</p>;
  }

  return (
    <ul className="judging-list">
      {progress.submissions.map((submission) => (
        <li key={submission.submissionId} className="judging-row">
          <div className="judging-row-main">
            <div className="judging-row-meta">
              <p className="judging-row-name">{submission.title}</p>
              {submission.teamName ? <p className="muted small">{submission.teamName}</p> : null}
            </div>
            <span className={`pill ${submission.isComplete ? "pill-good" : "pill-warn"}`}>
              {submission.reviewed}/{submission.total} {submission.isComplete ? "Scored" : "Incomplete"}
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

function nudgeHref(judge: OrganizerJudgingProgress["judges"][number], eventTitle: string): string {
  const subject = `Reminder: ${judge.pending} pending ${
    judge.pending === 1 ? "review" : "reviews"
  } for ${eventTitle}`;
  const body = `Hi ${judge.name},\n\nYou have ${judge.pending} of ${judge.total} submissions left to review for ${eventTitle}. Each review needs at least three feedback points before the event can close.\n\nThank you!`;
  return `mailto:${judge.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
