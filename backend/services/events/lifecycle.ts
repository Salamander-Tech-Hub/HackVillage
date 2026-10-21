export type LifecycleStatus =
  | "DRAFT"
  | "PENDING_ESCROW"
  | "PRIZE_VERIFIED"
  | "LIVE"
  | "JUDGING"
  | "CLOSED"
  | "ARCHIVED";

export type LifecycleAction =
  | "START_ESCROW"
  | "VERIFY_ESCROW"
  | "PUBLISH"
  | "START_JUDGING"
  | "CLOSE"
  | "ARCHIVE";

export type LifecycleEventSnapshot = {
  status: LifecycleStatus;
  title: string;
  problemStatement: string;
  prizePoolKes: number;
  startsAt: Date | string | null;
  endsAt: Date | string | null;
  escrowState: string | null;
  judgingReadiness?: {
    isReadyToClose: boolean;
    missingReason?: string | null;
  } | null;
};

export const LIFECYCLE_TRANSITIONS: Record<
  LifecycleAction,
  { from: LifecycleStatus; to: LifecycleStatus }
> = {
  START_ESCROW: { from: "DRAFT", to: "PENDING_ESCROW" },
  VERIFY_ESCROW: { from: "PENDING_ESCROW", to: "PRIZE_VERIFIED" },
  PUBLISH: { from: "PRIZE_VERIFIED", to: "LIVE" },
  START_JUDGING: { from: "LIVE", to: "JUDGING" },
  CLOSE: { from: "JUDGING", to: "CLOSED" },
  ARCHIVE: { from: "CLOSED", to: "ARCHIVED" },
};

export class LifecycleError extends Error {
  code: "INVALID_TRANSITION" | "PRECONDITION_FAILED" | "FORBIDDEN" | "NOT_FOUND";

  constructor(
    code: LifecycleError["code"],
    message: string,
  ) {
    super(message);
    this.name = "LifecycleError";
    this.code = code;
  }
}

export function isLifecycleAction(value: string): value is LifecycleAction {
  return value in LIFECYCLE_TRANSITIONS;
}

export function actionsForStatus(status: LifecycleStatus): LifecycleAction[] {
  return (Object.keys(LIFECYCLE_TRANSITIONS) as LifecycleAction[]).filter(
    (action) => LIFECYCLE_TRANSITIONS[action].from === status,
  );
}

export function assertTransition(
  status: LifecycleStatus,
  action: LifecycleAction,
): LifecycleStatus {
  const transition = LIFECYCLE_TRANSITIONS[action];
  if (status !== transition.from) {
    throw new LifecycleError(
      "INVALID_TRANSITION",
      `Cannot ${actionLabel(action)} while the event is ${statusLabel(status)}.`,
    );
  }
  return transition.to;
}

function assertSchedule(
  event: Pick<LifecycleEventSnapshot, "startsAt" | "endsAt">,
  beforeWhat: string,
): void {
  if (!event.startsAt || !event.endsAt) {
    throw new LifecycleError(
      "PRECONDITION_FAILED",
      `Set start and end times before ${beforeWhat}.`,
    );
  }
  if (new Date(event.endsAt).getTime() <= new Date(event.startsAt).getTime()) {
    throw new LifecycleError(
      "PRECONDITION_FAILED",
      `The end time must be after the start time before ${beforeWhat}.`,
    );
  }
}

export function assertPreconditions(
  action: LifecycleAction,
  event: LifecycleEventSnapshot,
): void {
  if (action === "START_ESCROW") {
    if (!event.title.trim() || !event.problemStatement.trim()) {
      throw new LifecycleError(
        "PRECONDITION_FAILED",
        "Add a title and problem statement before starting escrow.",
      );
    }
    if (!(event.prizePoolKes > 0)) {
      throw new LifecycleError(
        "PRECONDITION_FAILED",
        "Set a prize pool greater than zero before starting escrow.",
      );
    }
    assertSchedule(event, "starting escrow");
  }

  if (action === "VERIFY_ESCROW" && !event.escrowState) {
    throw new LifecycleError(
      "PRECONDITION_FAILED",
      "Start escrow before verifying the prize vault.",
    );
  }

  if (action === "PUBLISH") {
    if (event.escrowState !== "PRIZE_VAULT") {
      throw new LifecycleError(
        "PRECONDITION_FAILED",
        "Prize escrow must be verified before the event can go live.",
      );
    }
    assertSchedule(event, "publishing");
  }

  if (action === "CLOSE") {
    if (event.judgingReadiness && !event.judgingReadiness.isReadyToClose) {
      throw new LifecycleError(
        "PRECONDITION_FAILED",
        event.judgingReadiness.missingReason ??
          "Every assigned judge must review every submission before closing.",
      );
    }
  }
}

export function actionLabel(action: LifecycleAction): string {
  switch (action) {
    case "START_ESCROW":
      return "start escrow";
    case "VERIFY_ESCROW":
      return "verify escrow";
    case "PUBLISH":
      return "publish";
    case "START_JUDGING":
      return "start judging";
    case "CLOSE":
      return "close";
    case "ARCHIVE":
      return "archive";
  }
}

function statusLabel(status: LifecycleStatus): string {
  return status.replace(/_/g, " ").toLowerCase();
}
