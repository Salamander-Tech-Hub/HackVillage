-- CreateTable
CREATE TABLE "EventTransition" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" "EventStatus" NOT NULL,
    "toStatus" "EventStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventTransition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventTransition_eventId_idx" ON "EventTransition"("eventId");

-- CreateIndex
CREATE INDEX "EventTransition_actorId_idx" ON "EventTransition"("actorId");

-- AddForeignKey
ALTER TABLE "EventTransition" ADD CONSTRAINT "EventTransition_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTransition" ADD CONSTRAINT "EventTransition_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
