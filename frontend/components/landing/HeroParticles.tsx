const DOTS = [
  { left: "8%", top: "18%", size: 6, opacity: 0.18 },
  { left: "18%", top: "68%", size: 8, opacity: 0.12 },
  { left: "36%", top: "8%", size: 5, opacity: 0.14 },
  { left: "72%", top: "22%", size: 7, opacity: 0.16 },
  { left: "86%", top: "64%", size: 5, opacity: 0.12 },
  { left: "52%", top: "42%", size: 8, opacity: 0.18 },
  { left: "34%", top: "78%", size: 6, opacity: 0.14 },
  { left: "10%", top: "84%", size: 6, opacity: 0.1 },
] as const;

export function HeroParticles() {
  return (
    <div className="landing-hero-particles" aria-hidden="true">
      {DOTS.map((dot, index) => (
        <span
          key={index}
          className="landing-hero-particle"
          style={{
            left: dot.left,
            top: dot.top,
            width: dot.size,
            height: dot.size,
            opacity: dot.opacity,
          }}
        />
      ))}
    </div>
  );
}
