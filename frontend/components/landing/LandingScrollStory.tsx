"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LandingMorphModel } from "@/components/landing/LandingMorphModel";

type StoryLayout = "left" | "center" | "right";

const STORIES: {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  modelLabel: string;
  layout: StoryLayout;
  link?: { label: string; href: string };
}[] = [
  {
    id: "platform",
    eyebrow: "Connected event infrastructure",
    title: "One trusted record for every role.",
    body: "Organizers, builders, judges, and administrators work from the same event lifecycle instead of disconnected spreadsheets, chats, and promises.",
    bullets: [
      "Role-protected workspaces",
      "Draft-to-publish event management",
      "Prize-verified public discovery",
    ],
    modelLabel: "Role-aware network",
    layout: "left",
    link: { label: "Open organizer workspace", href: "/organizer" },
  },
  {
    id: "protocol",
    eyebrow: "The trust protocol",
    title: "No escrow. No live event.",
    body: "Prize commitments become visible before builders invest their time. Events move through explicit funding and verification states before public launch.",
    bullets: [
      "100% of the prize funded upfront",
      "Provider callbacks verified server-side",
      "Every state transition auditable",
    ],
    modelLabel: "Escrow prize vault",
    layout: "center",
  },
  {
    id: "builders",
    eyebrow: "Proof of work",
    title: "Every event strengthens a builder’s record.",
    body: "Participation should create more than a certificate. Teams, submissions, wins, contribution links, and judge feedback become durable evidence of skill.",
    bullets: [
      "Verified event participation",
      "Submission and team history",
      "Structured judge endorsements",
    ],
    modelLabel: "Verified skill record",
    layout: "right",
    link: { label: "Browse verified events", href: "/events" },
  },
  {
    id: "mission",
    eyebrow: "Beyond demo day",
    title: "Turn a competition into a career pathway.",
    body: "HackVillage is designed to connect credible rewards, transparent feedback, and developer opportunity so promising work can keep moving after the event ends.",
    bullets: [
      "50 / 50 milestone payout model",
      "Portfolio-ready project history",
      "A foundation for career introductions",
    ],
    modelLabel: "Builder growth pathway",
    layout: "center",
  },
];

export function LandingScrollStory() {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [storyVisible, setStoryVisible] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(false);
  const storyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = storyRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => setStoryVisible(entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const cta = document.querySelector<HTMLElement>(".landing-cta-section");
    if (!cta) return;

    const observer = new IntersectionObserver(
      ([entry]) => setCtaVisible(entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(cta);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={storyRef}
      className={`landing-story${storyVisible && !ctaVisible ? " landing-story--visible" : ""}`}
    >
      {activeIndex >= 0 ? (
        <LandingMorphModel
          activeIndex={activeIndex}
          modelLabel={STORIES[activeIndex]?.modelLabel ?? STORIES[0].modelLabel}
          position={STORIES[activeIndex]?.layout ?? STORIES[0].layout}
        />
      ) : null}
      {STORIES.map((story, index) => (
        <StorySection
          key={story.id}
          story={story}
          index={index}
          onActivate={setActiveIndex}
        />
      ))}
    </div>
  );
}

function StorySection({
  story,
  index,
  onActivate,
}: {
  story: (typeof STORIES)[number];
  index: number;
  onActivate: (index: number) => void;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = sectionRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
        if (entry.intersectionRatio >= 0.45) onActivate(index);
      },
      { rootMargin: "0px", threshold: [0, 0.45] },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [index, onActivate]);

  return (
    <section
      ref={sectionRef}
      id={story.id}
      className={`landing-story-section landing-story-section--model-${story.layout}${visible ? " is-visible" : ""}`}
      aria-labelledby={`${story.id}-title`}
    >
      <div className="landing-container landing-story-grid">
        {story.layout === "center" ? (
          <>
            <StoryIntroduction story={story} />
            <div className="landing-story-spacer" aria-hidden="true" />
            <StoryDetails story={story} />
          </>
        ) : (
          <>
            <div className="landing-story-spacer" aria-hidden="true" />
            <div className="landing-story-copy">
              <StoryIntroductionContent story={story} />
              <StoryDetailsContent story={story} />
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function StoryIntroduction({ story }: { story: (typeof STORIES)[number] }) {
  return (
    <div className="landing-story-copy landing-story-copy--primary">
      <StoryIntroductionContent story={story} />
    </div>
  );
}

function StoryIntroductionContent({ story }: { story: (typeof STORIES)[number] }) {
  return (
    <>
      <p className="landing-section-eyebrow">{story.eyebrow}</p>
      <h2 id={`${story.id}-title`}>{story.title}</h2>
      <p>{story.body}</p>
    </>
  );
}

function StoryDetails({ story }: { story: (typeof STORIES)[number] }) {
  return (
    <div className="landing-story-copy landing-story-copy--details">
      <p className="landing-section-eyebrow">What this unlocks</p>
      <StoryDetailsContent story={story} />
    </div>
  );
}

function StoryDetailsContent({ story }: { story: (typeof STORIES)[number] }) {
  return (
    <>
      <ul>
        {story.bullets.map((bullet) => (
          <li key={bullet}>
            <CheckIcon />
            {bullet}
          </li>
        ))}
      </ul>
      {story.link ? (
        <Link className="landing-text-link" href={story.link.href}>
          {story.link.label}
          <ArrowIcon />
        </Link>
      ) : null}
    </>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14M14 7l5 5-5 5" />
    </svg>
  );
}
