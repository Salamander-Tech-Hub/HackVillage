export type JudgeAssignment = {
  id: string;
  slug: string;
  title: string;
  status: string;
  problemStatement: string;
  submissionCount: number;
};

export type JudgeQueueItem = {
  id: string;
  title: string;
  teamName: string;
  repoUrl: string | null;
  demoUrl: string | null;
  feedback: { id: string; points: string[]; score: number | null } | null;
};

export type JudgeQueue = {
  event: { id: string; title: string; status: string };
  readiness: { complete: boolean; reason: string };
  submissions: JudgeQueueItem[];
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

export function listJudgeAssignments() {
  return request<{ events: JudgeAssignment[] }>("/api/judge/assignments");
}

export function getJudgeQueue(eventId: string) {
  return request<JudgeQueue>(`/api/events/${encodeURIComponent(eventId)}/judging`);
}

export function saveFeedback(
  submissionId: string,
  input: { points: string[]; score?: number | null },
) {
  return request(`/api/submissions/${encodeURIComponent(submissionId)}/feedback`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function assignJudge(eventId: string, email: string) {
  return request(`/api/events/${encodeURIComponent(eventId)}/judges`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

export function listEventJudges(eventId: string) {
  return request<{ judges: { id: string; judgeEmail: string; judgeName: string | null }[] }>(
    `/api/events/${encodeURIComponent(eventId)}/judges`,
  );
}
