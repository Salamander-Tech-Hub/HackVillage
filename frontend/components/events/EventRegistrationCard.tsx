"use client";

import { useEffect, useState } from "react";
import { getRegistration, registerForEvent } from "@/lib/developerApi";

export function EventRegistrationCard({
  eventId,
  status,
}: {
  eventId: string;
  status: string;
}) {
  const [registered, setRegistered] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const open = status === "PRIZE_VERIFIED" || status === "LIVE";

  useEffect(() => {
    let cancelled = false;
    getRegistration(eventId)
      .then((payload) => {
        if (!cancelled) setRegistered(payload.registered);
      })
      .catch(() => {
        if (!cancelled) setMessage("Sign in as a developer to register.");
      });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  async function onRegister() {
    try {
      setBusy(true);
      setMessage(null);
      await registerForEvent(eventId);
      setRegistered(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to register.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="workspace-note" style={{ marginTop: "1.25rem" }}>
      {registered ? (
        <p>
          <b>You are registered.</b> Open the attendee workspace to create or join a team.
        </p>
      ) : (
        <p>
          {open
            ? "Registration is open for prize-verified and live events."
            : "This event is not open for registration."}
        </p>
      )}
      <div className="actions" style={{ marginTop: "0.75rem" }}>
        <button
          type="button"
          className="btn primary"
          disabled={!open || registered || busy}
          onClick={() => void onRegister()}
        >
          {busy ? "Registering..." : registered ? "Registered" : "Register"}
        </button>
        <a className="btn" href="/attendee">
          Attendee workspace
        </a>
      </div>
      {message ? <p style={{ marginBottom: 0 }}>{message}</p> : null}
    </div>
  );
}
