import { prisma } from "@backend/lib/db";

const seededEmails = {
  organizer: "organizer@hackvillage.local",
  attendeeOne: "attendee1@hackvillage.local",
  attendeeTwo: "attendee2@hackvillage.local",
  judge: "judge@hackvillage.local",
} as const;

function logMockSeed() {
  console.log("Seeded emails:", [
    seededEmails.organizer,
    seededEmails.attendeeOne,
    seededEmails.attendeeTwo,
    seededEmails.judge,
  ]);

  console.log("Seeded records:", {
    draftEvent: "nairobi-prototype-lab",
    verifiedEvent: "nairobi-climate-sprint",
    team: "Seeded Climate Team",
    mode: "mock",
  });
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("DATABASE_URL is not set; running seed in mock-data mode.");
    logMockSeed();
    return;
  }

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

  console.log("Seeded emails:", [
    organizer.email,
    attendeeOne.email,
    attendeeTwo.email,
    judge.email,
  ]);

  console.log("Seeded records:", {
    draftEvent: draftEvent.slug,
    verifiedEvent: verifiedEvent.slug,
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
    await prisma.$disconnect();
  });
