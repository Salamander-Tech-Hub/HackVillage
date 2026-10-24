-- Organizer database hardening (#82).

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "LedgerKind" AS ENUM ('DEPOSIT', 'INSTANT_50', 'MILESTONE_50');

-- CreateEnum
CREATE TYPE "LifecycleAction" AS ENUM ('START_ESCROW', 'VERIFY_ESCROW', 'PUBLISH', 'START_JUDGING', 'CLOSE', 'ARCHIVE');

-- CreateEnum
CREATE TYPE "PayoutMethod" AS ENUM ('MPESA', 'BANK');

-- Stop early if any value has no matching enum.
DO $$
DECLARE
    bad_status TEXT;
    bad_kind TEXT;
BEGIN
    SELECT string_agg(DISTINCT quote_literal("status"), ', ')
      INTO bad_status
      FROM "Payout"
     WHERE UPPER(BTRIM("status")) NOT IN ('PENDING', 'SUCCESS', 'FAILED');

    IF bad_status IS NOT NULL THEN
        RAISE EXCEPTION 'Payout.status has values with no PayoutStatus equivalent: %. Fix or remap these rows, then re-run.', bad_status;
    END IF;

    SELECT string_agg(DISTINCT quote_literal("kind"), ', ')
      INTO bad_kind
      FROM "LedgerEntry"
     WHERE UPPER(BTRIM("kind")) NOT IN ('DEPOSIT', 'INSTANT_50', 'MILESTONE_50');

    IF bad_kind IS NOT NULL THEN
        RAISE EXCEPTION 'LedgerEntry.kind has values with no LedgerKind equivalent: %. Fix or remap these rows, then re-run.', bad_kind;
    END IF;
END $$;

-- AlterTable: Payout.status text -> PayoutStatus
ALTER TABLE "Payout" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Payout" ALTER COLUMN "status" TYPE "PayoutStatus" USING (UPPER(BTRIM("status"))::"PayoutStatus");
ALTER TABLE "Payout" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable: LedgerEntry.kind text -> LedgerKind
ALTER TABLE "LedgerEntry" ALTER COLUMN "kind" TYPE "LedgerKind" USING (UPPER(BTRIM("kind"))::"LedgerKind");

-- AlterTable: winner rank, prize amount and payout recipient (ORG-8)
ALTER TABLE "Submission"
    ADD COLUMN "winnerRank" INTEGER,
    ADD COLUMN "prizeAmountKes" DECIMAL(14,2),
    ADD COLUMN "payoutRecipientId" TEXT;

-- Prisma doesn't model check constraints, so these only exist in SQL
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_winnerRank_positive" CHECK ("winnerRank" IS NULL OR "winnerRank" >= 1);
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_prizeAmountKes_nonnegative" CHECK ("prizeAmountKes" IS NULL OR "prizeAmountKes" >= 0);

-- CreateTable
CREATE TABLE "EventTransition" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "action" "LifecycleAction" NOT NULL,
    "fromStatus" "EventStatus" NOT NULL,
    "toStatus" "EventStatus" NOT NULL,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventTransition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutRecipient" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "method" "PayoutMethod" NOT NULL,
    "accountRef" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "paystackRecipientCode" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayoutRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "reportUrl" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventTransition_eventId_idx" ON "EventTransition"("eventId");

-- CreateIndex
CREATE INDEX "PayoutRecipient_userId_idx" ON "PayoutRecipient"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Milestone_submissionId_key" ON "Milestone"("submissionId");

-- CreateIndex
CREATE INDEX "Event_organizerId_idx" ON "Event"("organizerId");

-- CreateIndex
CREATE INDEX "Submission_eventId_idx" ON "Submission"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_eventId_winnerRank_key" ON "Submission"("eventId", "winnerRank");

-- CreateIndex
CREATE INDEX "Payout_escrowVaultId_idx" ON "Payout"("escrowVaultId");

-- CreateIndex
CREATE INDEX "LedgerEntry_escrowVaultId_idx" ON "LedgerEntry"("escrowVaultId");

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_payoutRecipientId_fkey" FOREIGN KEY ("payoutRecipientId") REFERENCES "PayoutRecipient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTransition" ADD CONSTRAINT "EventTransition_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTransition" ADD CONSTRAINT "EventTransition_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutRecipient" ADD CONSTRAINT "PayoutRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
