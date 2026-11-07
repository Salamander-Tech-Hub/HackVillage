export function nextOrganizerStep(status: string, paystackConfigured: boolean): string {
  switch (status) {
    case "DRAFT":
      return "Fund the prize pool. That is the only way to leave draft.";
    case "PENDING_ESCROW":
      return paystackConfigured
        ? "Finish Paystack checkout. This page waits until the payment is confirmed."
        : "Paystack is off. Use Verify prize (test mode) to mark the vault funded.";
    case "PRIZE_VERIFIED":
      return "Publish the event so people can register and form teams.";
    case "LIVE":
      return "Assign judges, watch submissions, then start judging.";
    case "JUDGING":
      return "Close the event once every assigned judge has reviewed every submission.";
    case "CLOSED":
      return "Save the winners, pay the instant 50%, then the milestone 50%.";
    case "ARCHIVED":
      return "This event is archived. The history, ledger, and payouts stay on this page.";
    default:
      return "Follow the actions on this page to move the event forward.";
  }
}

export function transitionActionLabel(action: string): string {
  switch (action) {
    case "START_ESCROW":
      return "Funded prize pool";
    case "VERIFY_ESCROW":
      return "Prize verified";
    case "PUBLISH":
      return "Published";
    case "START_JUDGING":
      return "Judging started";
    case "CLOSE":
      return "Closed";
    case "ARCHIVE":
      return "Archived";
    default:
      return action.replace(/_/g, " ").toLowerCase();
  }
}

export function ledgerKindLabel(kind: string): string {
  switch (kind) {
    case "DEPOSIT":
      return "Prize deposit";
    case "INSTANT_50":
      return "Instant 50%";
    case "MILESTONE_50":
      return "Milestone 50%";
    default:
      return kind.replace(/_/g, " ").toLowerCase();
  }
}
