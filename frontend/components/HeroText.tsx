import Link from "next/link";

export default function HeroText() {
  return (
    <div className="hero-copy-content">
      <p className="hero-brand">HackVillage</p>

      <h1 className="hero-heading">
        The global standard for <span>prize-verified hackathons</span>
      </h1>

      <p className="hero-description">
        Host secure, high-impact developer competitions with trusted prize
        verification, transparent workflows, and a seamless experience for
        organizers and builders.
      </p>

      <div className="hero-actions">
        <Link href="/organizer" className="hero-btn hero-btn-primary">
          Start Organizing
        </Link>

        <Link href="/events" className="hero-btn hero-btn-secondary">
          Join as Builder
        </Link>
      </div>
    </div>
  );
}