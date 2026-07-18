import Link from "next/link";
import { listPublicEvents } from "@backend/services/events/public-events.service";

export const metadata = {
  title: "Events",
};

export default async function EventsPage() {
  let events: Awaited<ReturnType<typeof listPublicEvents>>["events"] = [];

  try {
    const payload = await listPublicEvents({ page: 1, limit: 6 });
    events = payload.events;
  } catch {
    events = [];
  }

  return (
    <main className="shell">
      <p className="brand">HackVillage</p>
      <h1>Public events</h1>
      <p className="lede">
        Drafts stay private. Only Prize-Verified and live events appear here for discovery.
      </p>
      <div className="actions">
        <Link className="btn" href="/">
          Back home
        </Link>
      </div>
      <div className="card-list" style={{ marginTop: "2rem", display: "grid", gap: "1rem" }}>
        {events.length === 0 ? (
          <p>No public events are available yet.</p>
        ) : (
          events.map((event) => (
            <article
              key={event.id}
              className="card"
              style={{
                border: "1px solid var(--line)",
                borderRadius: "0.75rem",
                padding: "1.25rem",
              }}
            >
              <h2 style={{ marginTop: 0 }}>{event.title}</h2>
              <p>{event.problemStatement}</p>
              <p>
                <strong>Status:</strong> {event.status}
              </p>
              <p>
                <strong>Prize:</strong> KES {event.prizePoolKes.toLocaleString()}
              </p>
              <Link className="btn" href={`/events/${event.slug}`}>
                View details
              </Link>
            </article>
          ))
        )}
      </div>
    </main>
  );
}
