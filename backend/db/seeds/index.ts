import { prisma } from "@backend/lib/db";

async function main() {
  const organizer = await prisma.user.upsert({
    where: { email: "organizer@hackvillage.local" },
    update: {},
    create: {
      email: "organizer@hackvillage.local",
      name: "Demo Organizer",
      role: "ORGANIZER",
    },
  });

  const developer = await prisma.user.upsert({
    where: { email: "dev@hackvillage.local" },
    update: {},
    create: {
      email: "dev@hackvillage.local",
      name: "Demo Developer",
      role: "DEVELOPER",
      githubHandle: "demo-dev",
      profile: {
        create: {
          bio: "Seeded developer profile for local development.",
          eventCount: 0,
          winCount: 0,
        },
      },
    },
  });

  const judge = await prisma.user.upsert({
    where: { email: "judge@hackvillage.local" },
    update: {},
    create: {
      email: "judge@hackvillage.local",
      name: "Demo Judge",
      role: "JUDGE",
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@hackvillage.local" },
    update: {},
    create: {
      email: "admin@hackvillage.local",
      name: "Demo Administrator",
      role: "ADMIN",
    },
  });

  const event = await prisma.event.upsert({
    where: { slug: "nairobi-climate-sprint" },
    update: {},
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

  console.log("Seeded:", {
    organizer: organizer.email,
    developer: developer.email,
    judge: judge.email,
    admin: admin.email,
    event: event.slug,
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
