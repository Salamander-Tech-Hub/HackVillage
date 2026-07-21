import HeroText from "@/components/HeroText";
import ThreeSphere from "@/components/ThreeSphere";

export default function Hero() {
  return (
    <section className="hero-page hero-spotlight">
      <div className="hero-shell">
        <div className="hero-copy">
          <HeroText />
        </div>

        <div className="hero-visual">
          <ThreeSphere />
        </div>
      </div>
    </section>
  );
}