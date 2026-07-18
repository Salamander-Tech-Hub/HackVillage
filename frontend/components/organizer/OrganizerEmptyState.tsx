import Link from "next/link";

type OrganizerEmptyStateProps = {
  title: string;
  description: string;
  createEventHref?: string;
};

export function OrganizerEmptyState({
  title,
  description,
  createEventHref,
}: OrganizerEmptyStateProps) {
  return (
    <div className="empty org-empty" role="status" aria-live="polite">
      <svg
        className="org-empty-icon"
        viewBox="0 0 48 48"
        width="48"
        height="48"
        aria-hidden="true"
      >
        <rect x="8" y="10" width="32" height="28" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M8 18h32" stroke="currentColor" strokeWidth="2" />
        <circle cx="15" cy="14" r="1.5" fill="currentColor" />
        <circle cx="20" cy="14" r="1.5" fill="currentColor" />
      </svg>
      <h2>{title}</h2>
      <p className="muted">{description}</p>
      {createEventHref ? (
        <Link className="btn primary" href={createEventHref}>
          Create event
        </Link>
      ) : (
        <p className="muted small">Create-event flow is not available yet in this build.</p>
      )}
    </div>
  );
}
