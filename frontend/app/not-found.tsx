import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The requested HackVillage page could not be found.",
};

export default function NotFoundPage() {
  return (
    <main className="state-page">
      <Link className="state-brand" href="/">
        <Image src="/images/hackvillage-logo-icon.svg" alt="" width={34} height={34} />
        <span>HackVillage</span>
      </Link>

      <div className="state-number" aria-hidden="true">
        404
      </div>
      <p className="auth-kicker">This path left the village</p>
      <h1>We could not find that page.</h1>
      <p>
        The link may be outdated, or the page may have moved. Return home or continue
        exploring verified events.
      </p>

      <div className="state-actions">
        <Link className="state-primary" href="/">
          Return home
        </Link>
        <Link className="state-secondary" href="/events">
          Browse verified events
        </Link>
      </div>
    </main>
  );
}
