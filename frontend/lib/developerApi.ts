export type DeveloperTeam = {
  id: string;
  eventId: string;
  name: string;
  members: { userId: string; name: string | null; email: string }[];
};

export type DeveloperSubmission = {
  id: string;
  teamId: string;
  title: string;
  repoUrl: string | null;
  demoUrl: string | null;
  status: string;
};

export type DeveloperParticipation = {
  event: { id: string; slug: string; title: string; status: string };
  registrationId: string;
  team: DeveloperTeam | null;
  submission: DeveloperSubmission | null;
};

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string } | string };
    if (typeof body.error === "string") return body.error;
    if (body.error?.message) return body.error.message;
  } catch {
    // ignore
  }
  return `Request failed with status ${response.status}`;
}

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    cache: "no-store",
    credentials: "same-origin",
    ...init,
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as T;
}

export function registerForEvent(eventId: string) {
  return request(`/api/events/${encodeURIComponent(eventId)}/registration`, {
    method: "POST",
  });
}

export function getRegistration(eventId: string) {
  return request<{ registered: boolean }>(
    `/api/events/${encodeURIComponent(eventId)}/registration`,
  );
}

export function listEventTeams(eventId: string) {
  return request<{ teams: DeveloperTeam[] }>(
    `/api/events/${encodeURIComponent(eventId)}/teams`,
  );
}

export function createTeam(eventId: string, name: string) {
  return request<DeveloperTeam>(`/api/events/${encodeURIComponent(eventId)}/teams`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

export function joinTeam(teamId: string) {
  return request<DeveloperTeam>(`/api/teams/${encodeURIComponent(teamId)}/join`, {
    method: "POST",
  });
}

export function saveSubmission(
  teamId: string,
  input: { title: string; repo_url?: string | null; demo_url?: string | null },
) {
  return request<DeveloperSubmission>(
    `/api/teams/${encodeURIComponent(teamId)}/submissions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
}

export function listMyParticipations() {
  return request<{ participations: DeveloperParticipation[] }>("/api/me/participations");
}
