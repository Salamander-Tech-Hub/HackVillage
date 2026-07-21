import React from "react";

export default function ThreeSphere() {
  return (
    <div className="hero-sphere-container" aria-hidden="true">
      <div className="hero-sphere">
        <div className="hero-sphere-glow" />
        <div className="hero-sphere-ring hero-sphere-ring-a" />
        <div className="hero-sphere-ring hero-sphere-ring-b" />
        <div className="hero-sphere-ring hero-sphere-ring-c" />
        <div className="hero-sphere-ring hero-sphere-ring-d" />
        <div className="hero-sphere-ring hero-sphere-ring-e" />
        <div className="hero-sphere-ring hero-sphere-ring-f" />
        <div className="hero-sphere-core" />
      </div>
    </div>
  );
}
