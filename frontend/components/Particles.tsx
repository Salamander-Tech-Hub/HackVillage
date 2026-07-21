export default function Particles() {
  const dots = [
    { left: "8%", top: "18%", size: 6, opacity: 0.18 },
    { left: "18%", top: "68%", size: 8, opacity: 0.12 },
    { left: "36%", top: "8%", size: 5, opacity: 0.14 },
    { left: "72%", top: "22%", size: 7, opacity: 0.16 },
    { left: "86%", top: "64%", size: 5, opacity: 0.12 },
    { left: "52%", top: "42%", size: 8, opacity: 0.18 },
    { left: "34%", top: "78%", size: 6, opacity: 0.14 },
    { left: "10%", top: "84%", size: 6, opacity: 0.1 },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(38,162,255,0.12),transparent_18%),radial-gradient(circle_at_85%_15%,rgba(56,189,248,0.08),transparent_22%)]" />
      {dots.map((dot, index) => (
        <span
          key={index}
          className="absolute block rounded-full bg-cyan-200/40 blur-sm"
          style={{ left: dot.left, top: dot.top, width: dot.size, height: dot.size, opacity: dot.opacity }}
        />
      ))}
    </div>
  );
}
