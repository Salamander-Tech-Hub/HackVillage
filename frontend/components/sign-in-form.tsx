"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const demoAccounts = [
  {
    label: "Organizer",
    email: "organizer@hackvillage.local",
    description: "Create and steward trusted events",
  },
  {
    label: "Developer",
    email: "dev@hackvillage.local",
    description: "Find events and build your proof of work",
  },
  {
    label: "Judge",
    email: "judge@hackvillage.local",
    description: "Review work with a clear rubric",
  },
  {
    label: "Administrator",
    email: "admin@hackvillage.local",
    description: "Support the platform and its communities",
  },
] as const;

type SignInFormProps = {
  returnTo: string | null;
};

export function SignInForm({ returnTo }: SignInFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, returnTo }),
      });
      const result = (await response.json()) as { error?: string; redirectTo?: string };

      if (!response.ok || !result.redirectTo) {
        setError(result.error ?? "We could not sign you in. Please try again.");
        return;
      }

      router.replace(result.redirectTo);
      router.refresh();
    } catch {
      setError("We could not reach HackVillage. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function chooseDemo(emailAddress: string) {
    setEmail(emailAddress);
    setPassword("hackvillage-demo");
    setError("");
  }

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      <div className="auth-fields">
        <div className="field-group">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.org"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-describedby={error ? "sign-in-error" : undefined}
            aria-invalid={Boolean(error)}
            required
          />
        </div>
        <div className="field-group">
          <div className="field-label-row">
            <label htmlFor="password">Password</label>
            <span>Local demo only</span>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-describedby={error ? "sign-in-error" : undefined}
            aria-invalid={Boolean(error)}
            required
          />
        </div>
      </div>

      {error ? (
        <p className="form-message error" id="sign-in-error" role="alert">
          {error}
        </p>
      ) : null}

      <button className="auth-submit" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Signing you in…" : "Sign in to your workspace"}
      </button>

      <div className="demo-divider" aria-hidden="true">
        <span>or enter a local demo workspace</span>
      </div>

      <div className="demo-list" aria-label="Demo accounts">
        {demoAccounts.map((account) => (
          <button
            className="demo-account"
            type="button"
            key={account.email}
            onClick={() => chooseDemo(account.email)}
            disabled={isSubmitting}
          >
            <span className="demo-account-title">{account.label}</span>
            <span className="demo-account-description">{account.description}</span>
            <span className="demo-account-arrow" aria-hidden="true">↗</span>
          </button>
        ))}
      </div>
    </form>
  );
}
