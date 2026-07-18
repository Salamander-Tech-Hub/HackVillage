import type { OrganizerEvent } from "./types";

/**
 * Mock dataset used when the database is unreachable (no DATABASE_URL, local
 * dev without Postgres, etc.). Keep it small, representative, and covering
 * multiple statuses so the Organizer dashboard UI renders every state.
 */
export const MOCK_ORGANIZER_EVENTS: OrganizerEvent[] = [
  {
    id: "mock_evt_climate",
    slug: "nairobi-climate-sprint",
    title: "Nairobi Climate Sprint",
    problemStatement:
      "Build tools that help Kenyan communities track and reduce local emissions.",
    status: "PRIZE_VERIFIED",
    prizePoolKes: 500_000,
    startsAt: "2026-08-14T08:00:00.000Z",
    endsAt: "2026-08-16T18:00:00.000Z",
    location: "Nairobi Garage",
    format: "IN_PERSON",
    registrationsCount: 140,
    submissionsCount: 12,
    updatedAt: "2026-07-10T10:20:00.000Z",
    escrow: {
      state: "PRIZE_VAULT",
      amountKes: 500_000,
      publicLedgerUrl: "https://amoy.polygonscan.com/tx/0xseedlock",
    },
  },
  {
    id: "mock_evt_fintech",
    slug: "mombasa-fintech-jam",
    title: "Mombasa Fintech Jam",
    problemStatement:
      "Ship a mobile-first payment or savings tool that works offline in coastal Kenya.",
    status: "LIVE",
    prizePoolKes: 750_000,
    startsAt: "2026-07-18T09:00:00.000Z",
    endsAt: "2026-07-20T20:00:00.000Z",
    location: "Mombasa Innovation Hub",
    format: "HYBRID",
    registrationsCount: 220,
    submissionsCount: 24,
    updatedAt: "2026-07-18T07:30:00.000Z",
    escrow: {
      state: "PARTIAL_RELEASED",
      amountKes: 750_000,
      publicLedgerUrl: "https://amoy.polygonscan.com/tx/0xmockfintech",
    },
  },
  {
    id: "mock_evt_health",
    slug: "kisumu-health-hack",
    title: "Kisumu Health Hack",
    problemStatement:
      "Digitize referral workflows for community health volunteers in Nyanza.",
    status: "PENDING_ESCROW",
    prizePoolKes: 300_000,
    startsAt: "2026-09-05T08:00:00.000Z",
    endsAt: "2026-09-06T20:00:00.000Z",
    location: "Kisumu Social Hall",
    format: "IN_PERSON",
    registrationsCount: 80,
    submissionsCount: 0,
    updatedAt: "2026-07-01T12:00:00.000Z",
    escrow: {
      state: "PENDING_DEPOSIT",
      amountKes: 300_000,
      publicLedgerUrl: null,
    },
  },
  {
    id: "mock_evt_agri",
    slug: "eldoret-agri-build",
    title: "Eldoret Agri Build",
    problemStatement:
      "Prototype yield-prediction tools for smallholder maize farmers.",
    status: "CLOSED",
    prizePoolKes: 400_000,
    startsAt: "2026-05-10T08:00:00.000Z",
    endsAt: "2026-05-12T18:00:00.000Z",
    location: "Eldoret County Hall",
    format: "VIRTUAL",
    registrationsCount: 160,
    submissionsCount: 18,
    updatedAt: "2026-05-18T09:40:00.000Z",
    escrow: {
      state: "FULLY_RELEASED",
      amountKes: 400_000,
      publicLedgerUrl: "https://amoy.polygonscan.com/tx/0xmockagri",
    },
  },
  {
    id: "mock_evt_draft",
    slug: "nakuru-civic-draft",
    title: "Nakuru Civic Tech (Draft)",
    problemStatement:
      "Design services that increase citizen participation in county budgeting.",
    status: "DRAFT",
    prizePoolKes: 250_000,
    startsAt: null,
    endsAt: null,
    location: null,
    format: null,
    registrationsCount: null,
    submissionsCount: 0,
    updatedAt: "2026-07-16T16:10:00.000Z",
    escrow: null,
  },
];
