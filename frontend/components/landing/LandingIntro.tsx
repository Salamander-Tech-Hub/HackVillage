"use client";

import { useEffect, useMemo, useState } from "react";

const BRAND = "HACK VILLAGE";
const GLYPHS = ["∆", "⌁", "Ø", "Ξ", "⌬", "Ж", "λ", "⋈", "◈", "Ψ", "∴", "⟁"];
const DURATION_MS = 2800;

export function LandingIntro() {
  const [progress, setProgress] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const startedAt = performance.now();
    let frame = 0;
    let exitTimer: ReturnType<typeof setTimeout> | undefined;
    let finishTimer: ReturnType<typeof setTimeout> | undefined;

    const animate = (now: number) => {
      const elapsed = now - startedAt;
      const duration = reduceMotion ? 450 : DURATION_MS;
      const nextProgress = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(nextProgress);

      if (nextProgress < 100) {
        frame = window.requestAnimationFrame(animate);
        return;
      }

      exitTimer = setTimeout(() => setExiting(true), reduceMotion ? 80 : 320);
      finishTimer = setTimeout(() => setFinished(true), reduceMotion ? 280 : 980);
    };

    frame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frame);
      if (exitTimer) clearTimeout(exitTimer);
      if (finishTimer) clearTimeout(finishTimer);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (finished) document.body.style.overflow = "";
  }, [finished]);

  const letters = useMemo(
    () =>
      BRAND.split("").map((letter, index) => {
        if (letter === " ") return " ";
        const letterOrder = index > 4 ? index - 1 : index;
        const start = 8 + letterOrder * 6.2;
        const end = start + 22;

        if (progress < start || progress >= end) return letter;
        const glyphIndex = Math.floor(progress * 0.7 + index * 3) % GLYPHS.length;
        return GLYPHS[glyphIndex];
      }),
    [progress],
  );

  if (finished) return null;

  return (
    <div
      className={`landing-intro${exiting ? " landing-intro--exiting" : ""}`}
      role="status"
      aria-live="polite"
      aria-label={`Loading HackVillage: ${progress}%`}
    >
      <div className="landing-intro-content">
        <div className="landing-intro-wordmark" aria-hidden="true">
          {letters.map((letter, index) => (
            <span key={index} className={letter === " " ? "landing-intro-space" : undefined}>
              {letter}
            </span>
          ))}
        </div>
        <div className="landing-intro-progress">
          <span>Initializing village</span>
          <strong>{String(progress).padStart(3, "0")}%</strong>
        </div>
        <div className="landing-intro-track" aria-hidden="true">
          <span style={{ transform: `scaleX(${progress / 100})` }} />
        </div>
      </div>
    </div>
  );
}
