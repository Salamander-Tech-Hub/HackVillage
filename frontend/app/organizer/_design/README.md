# Organizer dashboard design references

Mobile mockups for the organizer dashboard. This folder is private (`_` prefix), so Next.js does not route it.

The mockups use a bottom navigation with five tabs: **Home · Escrow · Winners · Media · Trust**.

`DESIGN.md` holds the design tokens (colors, typography, spacing). The `.html` files are Stitch exports that open directly in a browser, and each one has a matching `.png` screenshot.

## Screens

| Mockup | Target route | Active tab | Notes |
|---|---|---|---|
| [`create-hackathon.png`](./create-hackathon.png) | `/organizer/events/new` (and `/edit`) | Home | Steps 1 to 3 (General, Tracks, Rules): core info, timeline, tracks and prize escrow, verification rules |
| [`escrow-lock.html`](./escrow-lock.html) | `/organizer/events/new` (step 4) | Home | Step 4 (Escrow Lock): fund and lock the prize vault, cosigners, 48h cooling window |
| [`live-event-control.html`](./live-event-control.html) | `/organizer/events/[eventId]` | Home | Live event control: teams, submissions, judging pace, judge workload, emergency tools |
| [`finalize-winners.png`](./finalize-winners.png) | `/organizer/events/[eventId]/winners` | Winners | Ranked submissions, select winners, escrow liquidity, multi-sig confirmation |
| [`escrow.html`](./escrow.html) | `/organizer/escrow` | Escrow | Vault balances, payout pipeline with retry and sign, audit ledger |
| [`prize-release.html`](./prize-release.html) | `/organizer/events/[eventId]/release` | Escrow | Per-team handover proofs that must be verified before prizes are released, and the multi-sig signer log |
| [`media-vault.html`](./media-vault.html) | `/organizer/events/[eventId]/media` | Media | 48-hour media vault: required deliverables, uploads, gallery, storage proof (issue #54) |
| [`trust-score.png`](./trust-score.png) | `/organizer/trust` | Trust | Score, rank, vouchers, recent adjustments, boost actions, 6-month momentum |

## Shared reference data

Use these values so the screens stay consistent with each other:

- Event: **Pan-African DeFi & AI Buildathon 2024**, KES 2,500,000 prize pool (mockups still show USDC as placeholder art)
- **v1 payment rail: Paystack / KES.** Do not build USDT, USDC, Web3 wallets, or on-chain payouts from these screens.
- Track 1: $15,000 split $8,000 / $5,000 / $2,000 (ZK-Shield, AutonomousLiquidity, NilePay)
- Track 2: $10,000 bounty pool
- Trust Score: 98, with adjustments on a small scale (escrow pre-fund +2.0, full media verification +1.0, late handover -1.5)

## Fixes applied to the Stitch exports

- Completed the Tailwind theme from `DESIGN.md`. The export config was missing tokens such as `on-primary` and the typography sizes, so text on navy banners rendered dark and unreadable.
- Each screen has its own title, subtitle, and active tab instead of the copied "Media Vault" header.
- Removed the "PWA Node #402 Syncing" status strip and the "PWA" badge so the header matches the original mockups.
- The "Save Draft / Submit Vault for Multi-Sig Audit" bar now appears only on Media Vault. Prize Release has its own release action, and the other screens use their inline actions.
- Escrow Lock stepper labels match Create Hackathon (General, Tracks, Rules, Escrow Lock).
- Aligned prize amounts, trust point values, event name, and network (Arbitrum One) across screens.

## Payments (decided)

v1 is **Paystack (KES / M-Pesa / bank)**. Crypto in these HTML mockups (USDC, Arbitrum, Web3 wallet, gas, multi-sig) is leftover Stitch copy. When implementing Escrow, Escrow Lock, and Prize Release, use Paystack checkout, KES amounts, and the existing ledger — not wallets or USDT.

## Still open

- **Upload overlap:** Prize Release has a "Fast Handover Ingestion" upload area that duplicates the Media Vault uploader. Prefer linking to Media Vault when building.
- **Home overview** (`/organizer/overview`) still has no mockup.
