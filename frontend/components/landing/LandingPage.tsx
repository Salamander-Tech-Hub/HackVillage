import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { HeroParticles } from "@/components/landing/HeroParticles";
import { LandingIntro } from "@/components/landing/LandingIntro";
import { LandingScrollStory } from "@/components/landing/LandingScrollStory";
import { LandingThemeToggle } from "@/components/landing/LandingThemeToggle";

const ThreeSphere = dynamic(
  () => import("@/components/landing/ThreeSphere").then((mod) => mod.ThreeSphere),
  {
    ssr: false,
    loading: () => <div className="landing-hero-canvas landing-hero-canvas--fallback" aria-hidden="true" />,
  },
);

const PROOF_POINTS = [
  { value: "100%", label: "Prize funded before launch" },
  { value: "50 / 50", label: "Transparent payout model" },
  { value: "4", label: "Role-aware workspaces" },
  { value: "Open", label: "Auditable source code" },
] as const;

export function LandingPage() {
  return (
    <main className="landing-page">
      <LandingIntro />
      <LandingHeader />

      <section className="landing-hero" aria-labelledby="landing-title">
        <HeroParticles />
        <div className="landing-tech-grid" aria-hidden="true" />

        <div className="landing-hero-inner">
          <div className="landing-hero-copy">
            <p className="landing-eyebrow">
              <span aria-hidden="true" />
              Open-source trust infrastructure
            </p>
            <h1 id="landing-title" className="landing-hero-title">
              The standard for <span>prize-verified</span> tech events.
            </h1>
            <p className="landing-hero-lede">
              HackVillage helps organizers run accountable competitions and gives African builders
              verified proof of work, transparent prizes, and a clearer path beyond demo day.
            </p>
            <div className="landing-hero-actions">
              <Link className="landing-button landing-button--primary" href="/organizer">
                Start organizing <ArrowIcon />
              </Link>
              <Link className="landing-button landing-button--secondary" href="/events">
                Browse verified events
              </Link>
            </div>
            <div className="landing-hero-note">
              <span className="landing-status-dot" aria-hidden="true" />
              Test-mode escrow today. Production financial rails are in active development.
            </div>
          </div>

          <div className="landing-hero-visual" aria-label="Animated prize vault visualization">
            <div className="landing-orbit-glow" aria-hidden="true" />
            <ThreeSphere />
            <div className="landing-float-card landing-float-card--verified">
              <span className="landing-float-icon"><CheckIcon /></span>
              <span>
                <small>Event status</small>
                <strong>Prize verified</strong>
              </span>
            </div>
            <div className="landing-float-card landing-float-card--vault">
              <span className="landing-float-icon"><LockIcon /></span>
              <span>
                <small>Prize vault</small>
                <strong>Funds locked</strong>
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-proof" aria-label="HackVillage trust model">
        <div className="landing-container landing-proof-grid">
          {PROOF_POINTS.map((point) => (
            <div className="landing-proof-item" key={point.label}>
              <strong>{point.value}</strong>
              <span>{point.label}</span>
            </div>
          ))}
        </div>
      </section>

      <LandingScrollStory />

      <section className="landing-cta-section">
        <div className="landing-container">
          <div className="landing-cta">
            <div className="landing-cta-grid" aria-hidden="true" />
            <p className="landing-section-eyebrow">Start with a trusted event</p>
            <h2>Ready to build the next village?</h2>
            <p>Host an accountable event or discover opportunities where the prize promise is visible.</p>
            <div className="landing-hero-actions landing-cta-actions">
              <Link className="landing-button landing-button--primary" href="/organizer">
                Create an event <ArrowIcon />
              </Link>
              <Link className="landing-button landing-button--secondary" href="/events">
                Browse events
              </Link>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}

function LandingHeader() {
  return (
    <header className="landing-header">
      <div className="landing-container landing-nav">
        <Link className="landing-logo" href="/" aria-label="HackVillage home">
          <Image
            className="landing-logo-image"
            src="/images/hackvillage-logo-icon.svg"
            alt=""
            width={36}
            height={36}
            priority
          />
          <span>HackVillage</span>
        </Link>
        <nav className="landing-nav-links" aria-label="Main navigation">
          <a href="#platform">Platform</a>
          <a href="#protocol">Trust protocol</a>
          <a href="#mission">Mission</a>
        </nav>
        <div className="landing-nav-actions">
          <LandingThemeToggle />
          <Link className="landing-nav-signin" href="/sign-in">Sign in</Link>
          <Link className="landing-nav-cta" href="/events">Find events <ArrowIcon /></Link>
        </div>
      </div>
    </header>
  );
}

function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="landing-container landing-footer-grid">
        <div>
          <Link className="landing-logo" href="/">
            <Image
              className="landing-logo-image"
              src="/images/hackvillage-logo-icon.svg"
              alt=""
              width={36}
              height={36}
            />
            <span>HackVillage</span>
          </Link>
          <p>Trustworthy infrastructure for high-impact African tech events.</p>
        </div>
        <div className="landing-footer-links">
          <div>
            <strong>Platform</strong>
            <Link href="/events">Events</Link>
            <Link href="/organizer">Organizers</Link>
            <Link href="/attendee">Builders</Link>
          </div>
          <div>
            <strong>Project</strong>
            <a href="https://github.com/Salamander-Tech-Hub/HackVillage">Open source</a>
            <Link href="/sign-in">Sign in</Link>
          </div>
        </div>
      </div>
      <div className="landing-container landing-footer-bottom">
        <span>© {new Date().getFullYear()} HackVillage.</span>
        <span>Built for the African developer community.</span>
      </div>
    </footer>
  );
}

function SvgIcon({ children }: { children: React.ReactNode }) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">{children}</svg>;
}

function ArrowIcon() {
  return <SvgIcon><path d="M5 12h14M14 7l5 5-5 5" /></SvgIcon>;
}

function CheckIcon() {
  return <SvgIcon><path d="m5 12 4 4L19 6" /></SvgIcon>;
}

function LockIcon() {
  return <SvgIcon><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" /></SvgIcon>;
}
