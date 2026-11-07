"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createTeam,
  joinTeam,
  listEventTeams,
  listMyParticipations,
  saveSubmission,
  type DeveloperParticipation,
  type DeveloperTeam,
} from "@/lib/developerApi";

export function DeveloperWorkspace() {
  const [items, setItems] = useState<DeveloperParticipation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await listMyParticipations();
      setItems(payload.participations);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load your events.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <div className="workspace-note">Loading your registrations...</div>;
  }

  if (error) {
    return (
      <div className="workspace-note">
        <b>Could not load workspace.</b> {error}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="workspace-note">
        You have not registered for any events yet. Browse public events to join one.
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      {items.map((item) => (
        <ParticipationCard key={item.registrationId} item={item} onChange={() => void load()} />
      ))}
    </div>
  );
}

function ParticipationCard({
  item,
  onChange,
}: {
  item: DeveloperParticipation;
  onChange: () => void;
}) {
  const [teamName, setTeamName] = useState("");
  const [teams, setTeams] = useState<DeveloperTeam[]>([]);
  const [title, setTitle] = useState(item.submission?.title ?? "");
  const [repoUrl, setRepoUrl] = useState(item.submission?.repoUrl ?? "");
  const [demoUrl, setDemoUrl] = useState(item.submission?.demoUrl ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listEventTeams(item.event.id)
      .then((payload) => setTeams(payload.teams))
      .catch(() => setTeams([]));
  }, [item.event.id]);

  async function run(action: () => Promise<unknown>) {
    try {
      setBusy(true);
      setMessage(null);
      await action();
      onChange();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="workspace-note">
      <h2 style={{ marginTop: 0 }}>{item.event.title}</h2>
      <p>
        Status: {item.event.status}
        {item.team ? ` · Team: ${item.team.name}` : " · No team yet"}
      </p>

      {!item.team ? (
        <div className="actions" style={{ marginTop: "0.75rem", flexWrap: "wrap" }}>
          <input
            className="org-input"
            placeholder="Team name"
            value={teamName}
            onChange={(event) => setTeamName(event.target.value)}
            disabled={busy}
          />
          <button
            type="button"
            className="btn primary"
            disabled={busy || teamName.trim().length < 2}
            onClick={() => void run(() => createTeam(item.event.id, teamName))}
          >
            Create team
          </button>
          {teams
            .filter((team) => team.id)
            .map((team) => (
              <button
                key={team.id}
                type="button"
                className="btn"
                disabled={busy}
                onClick={() => void run(() => joinTeam(team.id))}
              >
                Join {team.name}
              </button>
            ))}
        </div>
      ) : (
        <form
          className="org-form"
          style={{ marginTop: "0.75rem" }}
          onSubmit={(event) => {
            event.preventDefault();
            void run(() =>
              saveSubmission(item.team!.id, {
                title,
                repo_url: repoUrl || null,
                demo_url: demoUrl || null,
              }),
            );
          }}
        >
          <input
            className="org-input"
            placeholder="Submission title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            disabled={busy}
          />
          <input
            className="org-input"
            placeholder="Repository URL"
            value={repoUrl}
            onChange={(event) => setRepoUrl(event.target.value)}
            disabled={busy}
          />
          <input
            className="org-input"
            placeholder="Demo URL"
            value={demoUrl}
            onChange={(event) => setDemoUrl(event.target.value)}
            disabled={busy}
          />
          <button type="submit" className="btn primary" disabled={busy || !title.trim()}>
            {item.submission ? "Update submission" : "Submit project"}
          </button>
        </form>
      )}
      {message ? <p>{message}</p> : null}
    </article>
  );
}
