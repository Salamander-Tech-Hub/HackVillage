const seededEmails = {
  organizer: "organizer@hackvillage.local",
  attendeeOne: "attendee1@hackvillage.local",
  attendeeTwo: "attendee2@hackvillage.local",
  judge: "judge@hackvillage.local",
  admin: "admin@hackvillage.local",
} as const;

function logMockSeed() {
  console.log("Seeded emails:", [
    seededEmails.organizer,
    seededEmails.attendeeOne,
    seededEmails.attendeeTwo,
    seededEmails.judge,
    seededEmails.admin,
  ]);

  console.log("Seeded records:", {
    draftEvent: "nairobi-prototype-lab",
    verifiedEvent: "nairobi-climate-sprint",
    closedEvent: "nairobi-data-sprint",
    team: "Seeded Climate Team",
    mode: "mock",
  });
}

type Db = typeof import("@backend/lib/db").prisma;

type SeedUser = { id: string };

// A finished event with two winners, so the payout, milestone and history
// screens have something to show. Safe to run more than once.
async function seedClosedEvent(
  db: Db,
  users: { organizer: SeedUser; attendeeOne: SeedUser; attendeeTwo: SeedUser; judge: SeedUser },
) {
  const startsAt = new Date("2026-08-01T08:00:00Z");
  const endsAt = new Date("2026-08-03T18:00:00Z");
  const mediaDeadlineAt = new Date("2026-08-10T18:00:00Z");

  const eventData = {
    title: "Nairobi Data Sprint",
    problemStatement: "Turn open county data into tools that residents can use.",
    status: "CLOSED" as const,
    prizePoolKes: 500000,
    startsAt,
    endsAt,
    mediaDeadlineAt,
    organizerId: users.organizer.id,
  };

  const event = await db.event.upsert({
    where: { slug: "nairobi-data-sprint" },
    update: eventData,
    create: { slug: "nairobi-data-sprint", ...eventData },
  });

  const vault = await db.escrowVault.upsert({
    where: { eventId: event.id },
    update: { state: "PARTIAL_RELEASED", amountKes: 500000 },
    create: {
      eventId: event.id,
      state: "PARTIAL_RELEASED",
      amountKes: 500000,
      paystackReference: "seed_ref_data_sprint",
    },
  });

  await db.judgeAssignment.upsert({
    where: { eventId_judgeId: { eventId: event.id, judgeId: users.judge.id } },
    update: {},
    create: { eventId: event.id, judgeId: users.judge.id },
  });

  async function ensureTeam(name: string, memberId: string) {
    const team =
      (await db.team.findFirst({ where: { eventId: event.id, name } })) ??
      (await db.team.create({ data: { eventId: event.id, name } }));
    await db.teamMember.upsert({
      where: { teamId_userId: { teamId: team.id, userId: memberId } },
      update: {},
      create: { teamId: team.id, userId: memberId },
    });
    return team;
  }

  async function ensureRecipient(
    userId: string,
    accountRef: string,
    accountName: string,
    verified: boolean,
  ) {
    const data = {
      method: "MPESA" as const,
      accountName,
      verifiedAt: verified ? new Date("2026-08-05T09:00:00Z") : null,
    };
    const existing = await db.payoutRecipient.findFirst({ where: { userId, accountRef } });
    if (existing) {
      return db.payoutRecipient.update({ where: { id: existing.id }, data });
    }
    return db.payoutRecipient.create({ data: { userId, accountRef, ...data } });
  }

  async function ensureWinner(
    teamId: string,
    title: string,
    rank: number,
    prizeAmountKes: number,
    payoutRecipientId: string,
  ) {
    const data = {
      title,
      status: "DEMO" as const,
      isWinner: true,
      winnerRank: rank,
      prizeAmountKes,
      payoutRecipientId,
    };
    const existing = await db.submission.findFirst({ where: { eventId: event.id, teamId } });
    if (existing) {
      return db.submission.update({ where: { id: existing.id }, data });
    }
    return db.submission.create({ data: { eventId: event.id, teamId, ...data } });
  }

  const teamOne = await ensureTeam("Maji Insights", users.attendeeOne.id);
  const teamTwo = await ensureTeam("Hewa Watch", users.attendeeTwo.id);

  const recipientOne = await ensureRecipient(
    users.attendeeOne.id,
    "254700000001",
    "Demo Attendee One",
    true,
  );
  const recipientTwo = await ensureRecipient(
    users.attendeeTwo.id,
    "254700000002",
    "Demo Attendee Two",
    false,
  );

  const first = await ensureWinner(teamOne.id, "County water dashboard", 1, 300000, recipientOne.id);
  const second = await ensureWinner(teamTwo.id, "Air quality alerts", 2, 200000, recipientTwo.id);

  for (const [submission, score] of [
    [first, 92],
    [second, 85],
  ] as const) {
    await db.judgeFeedback.upsert({
      where: { submissionId_judgeId: { submissionId: submission.id, judgeId: users.judge.id } },
      update: { score },
      create: {
        submissionId: submission.id,
        judgeId: users.judge.id,
        score,
        points: ["Clear problem statement", "Working demo"],
      },
    });
  }

  // First place has an approved handover report. Second place has submitted
  // one that is still waiting for the organizer.
  await db.milestone.upsert({
    where: { submissionId: first.id },
    update: {},
    create: {
      submissionId: first.id,
      reportUrl: "https://example.org/handover/county-water-dashboard",
      submittedAt: new Date("2026-08-12T10:00:00Z"),
      approvedById: users.organizer.id,
      approvedAt: new Date("2026-08-13T10:00:00Z"),
    },
  });
  await db.milestone.upsert({
    where: { submissionId: second.id },
    update: {},
    create: {
      submissionId: second.id,
      reportUrl: "https://example.org/handover/air-quality-alerts",
      submittedAt: new Date("2026-08-12T11:00:00Z"),
    },
  });

  // First place was paid. Second place's transfer failed and can be retried.
  await db.payout.upsert({
    where: { idempotencyKey: "seed-data-sprint-rank-1-instant" },
    update: { status: "SUCCESS", amountKes: 150000 },
    create: {
      escrowVaultId: vault.id,
      submissionId: first.id,
      phase: "INSTANT_50",
      amountKes: 150000,
      idempotencyKey: "seed-data-sprint-rank-1-instant",
      paystackTransferCode: "TRF_seed_rank_1",
      status: "SUCCESS",
    },
  });
  await db.payout.upsert({
    where: { idempotencyKey: "seed-data-sprint-rank-2-instant" },
    update: { status: "FAILED", amountKes: 100000 },
    create: {
      escrowVaultId: vault.id,
      submissionId: second.id,
      phase: "INSTANT_50",
      amountKes: 100000,
      idempotencyKey: "seed-data-sprint-rank-2-instant",
      status: "FAILED",
    },
  });

  const ledgerRows = [
    { kind: "DEPOSIT" as const, amountKes: 500000, txHash: "seed_paystack_deposit" },
    { kind: "INSTANT_50" as const, amountKes: 150000, txHash: "seed_paystack_transfer_1" },
  ];
  for (const row of ledgerRows) {
    const existing = await db.ledgerEntry.findFirst({
      where: { escrowVaultId: vault.id, txHash: row.txHash },
    });
    if (!existing) {
      await db.ledgerEntry.create({ data: { escrowVaultId: vault.id, ...row } });
    }
  }

  const steps = [
    { action: "START_ESCROW", fromStatus: "DRAFT", toStatus: "PENDING_ESCROW" },
    { action: "VERIFY_ESCROW", fromStatus: "PENDING_ESCROW", toStatus: "PRIZE_VERIFIED" },
    { action: "PUBLISH", fromStatus: "PRIZE_VERIFIED", toStatus: "LIVE" },
    { action: "START_JUDGING", fromStatus: "LIVE", toStatus: "JUDGING" },
    { action: "CLOSE", fromStatus: "JUDGING", toStatus: "CLOSED" },
  ] as const;
  await db.eventTransition.deleteMany({ where: { eventId: event.id } });
  await db.eventTransition.createMany({
    data: steps.map((step, index) => ({
      eventId: event.id,
      actorId: users.organizer.id,
      createdAt: new Date(startsAt.getTime() - (steps.length - index) * 24 * 60 * 60 * 1000),
      ...step,
    })),
  });

  return event;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("DATABASE_URL is not set; running seed in mock-data mode.");
    logMockSeed();
    return;
  }

  // Lazy-import so mock mode works before Prisma validates DATABASE_URL.
  const { prisma } = await import("@backend/lib/db");

  const organizer = await prisma.user.upsert({
    where: { email: seededEmails.organizer },
    update: {
      name: "Demo Organizer",
      role: "ORGANIZER",
    },
    create: {
      email: seededEmails.organizer,
      name: "Demo Organizer",
      role: "ORGANIZER",
    },
  });

  const attendeeOne = await prisma.user.upsert({
    where: { email: seededEmails.attendeeOne },
    update: {
      name: "Demo Attendee One",
      role: "DEVELOPER",
      githubHandle: "demo-attendee-one",
    },
    create: {
      email: seededEmails.attendeeOne,
      name: "Demo Attendee One",
      role: "DEVELOPER",
      githubHandle: "demo-attendee-one",
    },
  });

  const attendeeTwo = await prisma.user.upsert({
    where: { email: seededEmails.attendeeTwo },
    update: {
      name: "Demo Attendee Two",
      role: "DEVELOPER",
      githubHandle: "demo-attendee-two",
    },
    create: {
      email: seededEmails.attendeeTwo,
      name: "Demo Attendee Two",
      role: "DEVELOPER",
      githubHandle: "demo-attendee-two",
    },
  });

  const judge = await prisma.user.upsert({
    where: { email: seededEmails.judge },
    update: {
      name: "Demo Judge",
      role: "JUDGE",
    },
    create: {
      email: seededEmails.judge,
      name: "Demo Judge",
      role: "JUDGE",
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: seededEmails.admin },
    update: {
      name: "Demo Administrator",
      role: "ADMIN",
    },
    create: {
      email: seededEmails.admin,
      name: "Demo Administrator",
      role: "ADMIN",
    },
  });

  await Promise.all([
    prisma.developerProfile.upsert({
      where: { userId: attendeeOne.id },
      update: {
        bio: "Seeded attendee profile for local development.",
        eventCount: 0,
        winCount: 0,
      },
      create: {
        userId: attendeeOne.id,
        bio: "Seeded attendee profile for local development.",
        eventCount: 0,
        winCount: 0,
      },
    }),
    prisma.developerProfile.upsert({
      where: { userId: attendeeTwo.id },
      update: {
        bio: "Seeded attendee profile for local development.",
        eventCount: 0,
        winCount: 0,
      },
      create: {
        userId: attendeeTwo.id,
        bio: "Seeded attendee profile for local development.",
        eventCount: 0,
        winCount: 0,
      },
    }),
  ]);

  const draftEvent = await prisma.event.upsert({
    where: { slug: "nairobi-prototype-lab" },
    update: {
      title: "Nairobi Prototype Lab",
      problemStatement:
        "Draft event for teams experimenting with civic and climate prototypes.",
      status: "DRAFT",
      prizePoolKes: 250000,
      organizerId: organizer.id,
    },
    create: {
      slug: "nairobi-prototype-lab",
      title: "Nairobi Prototype Lab",
      problemStatement:
        "Draft event for teams experimenting with civic and climate prototypes.",
      status: "DRAFT",
      prizePoolKes: 250000,
      organizerId: organizer.id,
    },
  });

  const verifiedEvent = await prisma.event.upsert({
    where: { slug: "nairobi-climate-sprint" },
    update: {
      title: "Nairobi Climate Sprint",
      problemStatement:
        "Build tools that help Kenyan communities track and reduce local emissions.",
      status: "PRIZE_VERIFIED",
      prizePoolKes: 500000,
      organizerId: organizer.id,
      escrowVault: {
        upsert: {
          create: {
            state: "PRIZE_VAULT",
            amountKes: 500000,
            paystackReference: "seed_ref_demo",
            ledgerTxHash: "0xseedlock",
            publicLedgerUrl: "https://amoy.polygonscan.com/tx/0xseedlock",
          },
          update: {
            state: "PRIZE_VAULT",
            amountKes: 500000,
            paystackReference: "seed_ref_demo",
            ledgerTxHash: "0xseedlock",
            publicLedgerUrl: "https://amoy.polygonscan.com/tx/0xseedlock",
          },
        },
      },
      internshipTags: {
        deleteMany: {},
        create: [{ label: "Climate Tech Internship", hrContact: "hr@example.org" }],
      },
    },
    create: {
      slug: "nairobi-climate-sprint",
      title: "Nairobi Climate Sprint",
      problemStatement:
        "Build tools that help Kenyan communities track and reduce local emissions.",
      status: "PRIZE_VERIFIED",
      prizePoolKes: 500000,
      organizerId: organizer.id,
      escrowVault: {
        create: {
          state: "PRIZE_VAULT",
          amountKes: 500000,
          paystackReference: "seed_ref_demo",
          ledgerTxHash: "0xseedlock",
          publicLedgerUrl: "https://amoy.polygonscan.com/tx/0xseedlock",
        },
      },
      internshipTags: {
        create: [{ label: "Climate Tech Internship", hrContact: "hr@example.org" }],
      },
    },
  });

  const existingTeam = await prisma.team.findFirst({
    where: {
      eventId: verifiedEvent.id,
      name: "Seeded Climate Team",
    },
  });

  const team =
    existingTeam ??
    (await prisma.team.create({
      data: {
        name: "Seeded Climate Team",
        eventId: verifiedEvent.id,
      },
    }));

  await Promise.all([
    prisma.teamMember.upsert({
      where: {
        teamId_userId: {
          teamId: team.id,
          userId: attendeeOne.id,
        },
      },
      update: {},
      create: {
        teamId: team.id,
        userId: attendeeOne.id,
      },
    }),
    prisma.teamMember.upsert({
      where: {
        teamId_userId: {
          teamId: team.id,
          userId: attendeeTwo.id,
        },
      },
      update: {},
      create: {
        teamId: team.id,
        userId: attendeeTwo.id,
      },
    }),
    prisma.judgeAssignment.upsert({
      where: {
        eventId_judgeId: {
          eventId: verifiedEvent.id,
          judgeId: judge.id,
        },
      },
      update: {},
      create: {
        eventId: verifiedEvent.id,
        judgeId: judge.id,
      },
    }),
  ]);

  const closedEvent = await seedClosedEvent(prisma, {
    organizer,
    attendeeOne,
    attendeeTwo,
    judge,
  });

  console.log("Seeded emails:", [
    organizer.email,
    attendeeOne.email,
    attendeeTwo.email,
    judge.email,
    admin.email,
  ]);

  console.log("Seeded records:", {
    draftEvent: draftEvent.slug,
    verifiedEvent: verifiedEvent.slug,
    closedEvent: closedEvent.slug,
    team: team.name,
    mode: "database",
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    if (!process.env.DATABASE_URL) {
      return;
    }

    const { prisma } = await import("@backend/lib/db");
    await prisma.$disconnect();
  });
