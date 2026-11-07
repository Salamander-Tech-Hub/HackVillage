"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const result = (await response.json()) as { error?: string; redirectTo?: string };
      if (!response.ok || !result.redirectTo) {
        setError(result.error ?? "Unable to create your account.");
        return;
      }
      router.replace(result.redirectTo);
      router.refresh();
    } catch {
      setError("Unable to create your account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel" style={{ margin: "auto" }}>
        <div className="auth-panel-heading">
          <p className="auth-kicker">Create an account</p>
          <h2>Join as a developer</h2>
          <p>Use your own email and password. Organizer and judge roles stay assigned by administrators.</p>
        </div>
        <form className="auth-form" onSubmit={(event) => void onSubmit(event)}>
          <div className="auth-fields">
            <div className="field-group">
              <label htmlFor="name">Name</label>
              <input id="name" value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
            <div className="field-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="field-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
          </div>
          {error ? <p className="form-message error">{error}</p> : null}
          <button className="auth-submit" type="submit" disabled={busy}>
            {busy ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className="auth-footnote">
          Already have an account? <Link href="/sign-in">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
