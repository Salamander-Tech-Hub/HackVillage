"use client";

import { useEffect, useState } from "react";

type MeUser = {
  id: string;
  name: string | null;
  githubHandle: string | null;
};

type MeProfile = {
  winCount: number;
  eventCount: number;
};

export function ProfileStub() {
  const [user, setUser] = useState<MeUser | null>(null);
  const [profile, setProfile] = useState<MeProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [handle, setHandle] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [userRes, profileRes] = await Promise.all([
          fetch("/api/me", { credentials: "same-origin", cache: "no-store" }),
          fetch("/api/me/profile", { credentials: "same-origin", cache: "no-store" }),
        ]);

        if (!userRes.ok || !profileRes.ok) {
          throw new Error("Unable to load profile.");
        }

        const nextUser = (await userRes.json()) as MeUser;
        const nextProfile = (await profileRes.json()) as MeProfile;
        if (cancelled) return;
        setUser(nextUser);
        setProfile(nextProfile);
        setHandle(nextUser.githubHandle ?? "");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load profile.");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveHandle(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/me", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ github_handle: handle.trim() }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(body?.error?.message || "Unable to update GitHub handle.");
      }
      const nextUser = (await response.json()) as MeUser;
      setUser(nextUser);
      setHandle(nextUser.githubHandle ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update GitHub handle.");
    } finally {
      setSaving(false);
    }
  }

  if (error && !user) {
    return <div className="workspace-note">{error}</div>;
  }

  if (!user || !profile) {
    return <div className="workspace-note">Loading profile…</div>;
  }

  return (
    <div className="workspace-note">
      <p>
        <b>{user.name || "Anonymous developer"}</b>
      </p>
      <p>@{user.githubHandle || "no-github-handle"}</p>
      <p>
        {profile.winCount} wins · {profile.eventCount} events
      </p>
      <form onSubmit={saveHandle} style={{ marginTop: "1rem", display: "grid", gap: "0.75rem" }}>
        <label>
          GitHub handle
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            name="github_handle"
            required
            style={{ display: "block", width: "100%", marginTop: "0.35rem" }}
          />
        </label>
        <button className="btn primary" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Update profile"}
        </button>
        {error ? <p>{error}</p> : null}
      </form>
    </div>
  );
}
