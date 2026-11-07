"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  OrganizerApiError,
  declareWinners,
  getEventSubmissions,
  getEventTeams,
} from "@/lib/organizerApi";
import {
  buildParticipantProjects,
  canPickWinners,
  filterParticipantProjects,
  sameWinnerSet,
  winnerIdsFromSubmissions,
} from "@/lib/participants";
import type { OrganizerSubmission, OrganizerTeam, ParticipantProject } from "@/lib/types";

type PanelState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; teams: OrganizerTeam[]; submissions: OrganizerSubmission[] };

type Tab = "projects" | "teams";

export function ParticipantsPanel({
  eventId,
  status,
}: {
  eventId: string;
  status: string;
}) {
  const [state, setState] = useState<PanelState>({ kind: "loading" });
  const [tab, setTab] = useState<Tab>("projects");
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const [teams, submissions] = await Promise.all([
        getEventTeams(eventId),
        getEventSubmissions(eventId),
      ]);
      setSelectedIds(winnerIdsFromSubmissions(submissions));
      setState({ kind: "ready", teams, submissions });
    } catch (error) {
      setState({
        kind: "error",
        message:
          error instanceof OrganizerApiError
            ? error.message
            : "Unable to load teams and submissions.",
      });
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  const projects = useMemo(
    () =>
      state.kind === "ready"
        ? buildParticipantProjects(state.teams, state.submissions)
        : [],
    [state],
  );
  const visibleProjects = useMemo(
    () => filterParticipantProjects(projects, query),
    [projects, query],
  );
  const savedWinnerIds =
    state.kind === "ready" ? winnerIdsFromSubmissions(state.submissions) : [];
  const picking = canPickWinners(status);
  const dirty = picking && !sameWinnerSet(savedWinnerIds, selectedIds);

  async function saveWinners() {
    if (!picking || selectedIds.length === 0 || busy) return;
    try {
      setBusy(true);
      setMessage(null);
      await declareWinners(eventId, selectedIds);
      const submissions = await getEventSubmissions(eventId);
      setSelectedIds(winnerIdsFromSubmissions(submissions));
      setState((current) =>
        current.kind === "ready" ? { ...current, submissions } : current,
      );
      setMessage(
        selectedIds.length === 1
          ? "Winner saved. Payouts can start after the event is closed."
          : `${selectedIds.length} winners saved. Payouts can start after the event is closed.`,
      );
    } catch (error) {
      setMessage(
        error instanceof OrganizerApiError
          ? error.message
          : "Unable to save winners.",
      );
    } finally {
      setBusy(false);
    }
  }

  function toggleWinner(submissionId: string) {
    setSelectedIds((current) =>
      current.includes(submissionId)
        ? current.filter((id) => id !== submissionId)
        : [...current, submissionId],
    );
  }

  return (
    <section className="org-form org-participants" aria-labelledby="org-participants-title">
      <header className="org-participants-header">
        <div>
          <h2 id="org-participants-title" className="dashboard-title" style={{ fontSize: "1.4rem" }}>
            Participants
          </h2>
          <p className="muted small">
            Teams and submitted projects for this event. Pick winners from the list — do not type
            submission IDs.
          </p>
        </div>
        {state.kind === "ready" ? (
          <p className="muted small">
            {state.teams.length} teams · {state.submissions.length} projects
            {savedWinnerIds.length > 0 ? ` · ${savedWinnerIds.length} winners` : ""}
          </p>
        ) : null}
      </header>

      <label className="org-field">
        <span className="sr-only">Search teams and projects</span>
        <input
          className="org-input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search projects, teams, repos..."
        />
      </label>

      <div className="org-tabs" role="tablist" aria-label="Participants views">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "projects"}
          className={tab === "projects" ? "org-tab is-active" : "org-tab"}
          onClick={() => setTab("projects")}
        >
          Projects ({visibleProjects.filter((row) => row.submissionId).length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "teams"}
          className={tab === "teams" ? "org-tab is-active" : "org-tab"}
          onClick={() => setTab("teams")}
        >
          Teams ({state.kind === "ready" ? state.teams.length : 0})
        </button>
      </div>

      {state.kind === "loading" ? (
        <div className="kpi-grid" aria-busy="true">
          <div className="kpi skeleton-card" />
          <div className="kpi skeleton-card" />
        </div>
      ) : null}

      {state.kind === "error" ? (
        <div className="banner banner-warn" role="alert">
          <strong>Could not load participants.</strong> {state.message}
          <div className="org-inline-actions">
            <button type="button" className="btn" onClick={() => void load()}>
              Retry
            </button>
          </div>
        </div>
      ) : null}

      {state.kind === "ready" && tab === "projects" ? (
        <ProjectList
          projects={visibleProjects}
          picking={picking}
          selectedIds={selectedIds}
          onToggle={toggleWinner}
        />
      ) : null}

      {state.kind === "ready" && tab === "teams" ? (
        <TeamList teams={filterTeams(state.teams, query)} projects={projects} />
      ) : null}

      {state.kind === "ready" && picking ? (
        <div className="org-form-actions">
          <button
            type="button"
            className="btn primary"
            disabled={busy || selectedIds.length === 0 || !dirty}
            onClick={() => void saveWinners()}
          >
            {busy ? "Saving winners..." : "Finalize winners"}
          </button>
          <p className="muted small">
            {selectedIds.length === 0
              ? "Select at least one submitted project."
              : dirty
                ? `${selectedIds.length} selected. This replaces the current winner list.`
                : "Winner list is up to date."}
          </p>
        </div>
      ) : state.kind === "ready" ? (
        <p className="muted small">
          Winner selection opens when the event is in judging or closed.
        </p>
      ) : null}

      {message ? <p className="muted">{message}</p> : null}
    </section>
  );
}

function ProjectList({
  projects,
  picking,
  selectedIds,
  onToggle,
}: {
  projects: ParticipantProject[];
  picking: boolean;
  selectedIds: string[];
  onToggle: (submissionId: string) => void;
}) {
  if (projects.length === 0) {
    return <p className="muted">No teams or projects match that search.</p>;
  }

  return (
    <ul className="org-project-list">
      {projects.map((project) => {
        const selected = project.submissionId
          ? selectedIds.includes(project.submissionId)
          : false;
        return (
          <li
            key={project.submissionId ?? project.teamId}
            className={
              project.isWinner || selected
                ? "org-project-card is-winner"
                : "org-project-card"
            }
          >
            <div className="org-project-top">
              <div>
                <h3 className="org-project-title">
                  {project.title ?? "No submission yet"}
                </h3>
                <p className="muted small">{project.teamName}</p>
              </div>
              <div className="org-project-flags">
                {project.isWinner ? <span className="org-chip org-chip-win">Winner</span> : null}
                {!project.submissionId ? (
                  <span className="org-chip org-chip-warn">Draft incomplete</span>
                ) : null}
              </div>
            </div>

            <div className="org-link-row">
              {project.repoUrl ? (
                <a className="ledger-link" href={project.repoUrl} target="_blank" rel="noreferrer">
                  Repo
                </a>
              ) : (
                <span className="muted small">No repo</span>
              )}
              {project.demoUrl ? (
                <a className="ledger-link" href={project.demoUrl} target="_blank" rel="noreferrer">
                  Demo
                </a>
              ) : (
                <span className="muted small">No demo</span>
              )}
            </div>

            <p className="muted small">
              {formatMembers(project.members) || "No members listed."}
            </p>

            {picking && project.submissionId ? (
              <label className="org-winner-toggle">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => onToggle(project.submissionId!)}
                />
                {selected ? "Selected winner" : "Select winner"}
              </label>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function TeamList({
  teams,
  projects,
}: {
  teams: OrganizerTeam[];
  projects: ParticipantProject[];
}) {
  if (teams.length === 0) {
    return <p className="muted">No teams match that search.</p>;
  }

  const projectByTeam = new Map(projects.map((project) => [project.teamId, project]));

  return (
    <ul className="org-project-list">
      {teams.map((team) => {
        const project = projectByTeam.get(team.id);
        return (
          <li key={team.id} className="org-project-card">
            <h3 className="org-project-title">{team.name}</h3>
            <p className="muted small">{formatMembers(team.members) || "No members yet."}</p>
            <p className="muted small">
              {project?.title ? `Project: ${project.title}` : "No submission yet."}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

function filterTeams(teams: OrganizerTeam[], query: string): OrganizerTeam[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return teams;
  return teams.filter((team) => {
    const haystack = [
      team.name,
      ...team.members.map((member) => member.name),
      ...team.members.map((member) => member.email),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}

function formatMembers(members: { name: string | null; email: string }[]) {
  return members
    .map((member) => member.name || member.email)
    .filter(Boolean)
    .join(" · ");
}
