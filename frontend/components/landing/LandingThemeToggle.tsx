"use client";

import { useEffect, useState } from "react";

type LandingTheme = "dark" | "light";

export function LandingThemeToggle() {
  const [theme, setTheme] = useState<LandingTheme>("dark");

  useEffect(() => {
    const saved = window.localStorage.getItem("hackvillage-landing-theme");
    const preferred: LandingTheme =
      saved === "light" || saved === "dark"
        ? saved
        : window.matchMedia("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark";

    setTheme(preferred);
    document.documentElement.dataset.landingTheme = preferred;
  }, []);

  const toggleTheme = () => {
    const nextTheme: LandingTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.landingTheme = nextTheme;
    window.localStorage.setItem("hackvillage-landing-theme", nextTheme);
  };

  return (
    <button
      type="button"
      className="landing-theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 15.2A8.5 8.5 0 0 1 8.8 4a8.5 8.5 0 1 0 11.2 11.2Z" />
    </svg>
  );
}
