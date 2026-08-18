"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { HeroParticles } from "@/components/landing/HeroParticles";

const ThreeSphere = dynamic(
  () => import("@/components/landing/ThreeSphere").then((mod) => mod.ThreeSphere),
  {
    ssr: false,
    loading: () => <div className="landing-hero-canvas landing-hero-canvas--fallback" aria-hidden="true" />,
  },
);

export function LandingHero() {
  return (
    <section className="landing-hero" aria-labelledby="landing-hero-brand">
      <HeroParticles />

      <div className="landing-hero-inner">
        <div className="landing-hero-copy">
          <p id="landing-hero-brand" className="landing-hero-brand">
            HackVillage
          </p>
          <h1 className="landing-hero-title">
            The global standard for{" "}
            <span>prize-verified</span> hackathons
          </h1>
          <p className="landing-hero-lede">
            Host secure, high-stakes developer competitions with escrow-backed prizes,
            clear auditability, and real-time trust signals.
          </p>
          <div className="landing-hero-actions">
            <Link className="landing-hero-btn landing-hero-btn--primary" href="/organizer">
              Start Organizing
            </Link>
            <Link className="landing-hero-btn" href="/events">
              Join as Builder
            </Link>
          </div>
        </div>

        <div className="landing-hero-visual">
          <ThreeSphere />
        </div>
      </div>
    </section>
  );
}
