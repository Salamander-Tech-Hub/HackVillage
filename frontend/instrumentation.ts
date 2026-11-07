export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") {
    return;
  }

  const { logRuntimeEnvIssues } = await import("@backend/lib/env");
  logRuntimeEnvIssues();
}
