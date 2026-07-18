import type { EscrowState, EventStatus, KnownEventStatus } from "@/lib/types";

const EVENT_LABELS: Record<KnownEventStatus, string> = {
  DRAFT: "Draft",
  PENDING_ESCROW: "Pending Escrow",
  PRIZE_VERIFIED: "Prize Verified",
  LIVE: "Live",
  JUDGING: "Judging",
  CLOSED: "Closed",
  ARCHIVED: "Archived",
};

const EVENT_TONE: Record<KnownEventStatus, string> = {
  DRAFT: "pill-muted",
  PENDING_ESCROW: "pill-warn",
  PRIZE_VERIFIED: "pill-brand",
  LIVE: "pill-good",
  JUDGING: "pill-info",
  CLOSED: "pill-muted",
  ARCHIVED: "pill-muted",
};

const ESCROW_LABELS: Record<EscrowState, string> = {
  PENDING_DEPOSIT: "Awaiting Deposit",
  PRIZE_VAULT: "Locked in Vault",
  PARTIAL_RELEASED: "50% Released",
  FULLY_RELEASED: "Fully Released",
  LOCKED_ERROR: "Locked · Error",
};

const ESCROW_TONE: Record<EscrowState, string> = {
  PENDING_DEPOSIT: "pill-warn",
  PRIZE_VAULT: "pill-brand",
  PARTIAL_RELEASED: "pill-info",
  FULLY_RELEASED: "pill-good",
  LOCKED_ERROR: "pill-bad",
};

export function EventStatusPill({ status }: { status: EventStatus }) {
  const normalized = String(status).toUpperCase() as KnownEventStatus;
  const label = EVENT_LABELS[normalized] ?? `Unknown (${String(status)})`;
  const tone = EVENT_TONE[normalized] ?? "pill-muted";

  return (
    <span className={`pill ${tone}`} aria-label={`Event status: ${label}`}>
      {label}
    </span>
  );
}

export function EscrowStatePill({ state }: { state: EscrowState }) {
  return (
    <span className={`pill ${ESCROW_TONE[state]}`}>{ESCROW_LABELS[state]}</span>
  );
}
