"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EventForm } from "@/components/organizer/EventForm";
import { eventToFormValues } from "@/lib/eventForm";
import {
  OrganizerApiError,
  getOrganizerEventById,
  updateEvent,
} from "@/lib/organizerApi";
import type { EventFormInput, FieldErrorMap, OrganizerEvent } from "@/lib/types";

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string; status?: number }
  | { kind: "ready"; event: OrganizerEvent };

export default function OrganizerEditEventPage({
  params,
}: {
  params: { eventId: string };
}) {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [serverFieldErrors, setServerFieldErrors] = useState<FieldErrorMap>();

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const event = await getOrganizerEventById(params.eventId);
      setState({ kind: "ready", event });
    } catch (error) {
      if (error instanceof OrganizerApiError) {
        setState({ kind: "error", message: error.message, status: error.status });
      } else {
        setState({ kind: "error", message: "Unable to load event for editing." });
      }
    }
  }, [params.eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  const initialValues = useMemo(() => {
    if (state.kind !== "ready") return null;
    return eventToFormValues(state.event);
  }, [state]);

  async function handleSubmit(payload: EventFormInput) {
    if (submitting || state.kind !== "ready") return;

    try {
      setSubmitting(true);
      setFormError(null);
      setServerFieldErrors(undefined);
      const updated = await updateEvent(state.event.id, payload);
      router.push(`/organizer/events/${encodeURIComponent(updated.id)}`);
      router.refresh();
    } catch (error) {
      if (error instanceof OrganizerApiError) {
        setFormError(error.message);
      } else {
        setFormError("Unexpected error while saving event changes.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const canEdit = state.kind === "ready" && state.event.status === "DRAFT";

  return (
    <section className="org-panel" aria-live="polite">
      <div className="org-inline-actions">
        <Link className="btn" href={`/organizer/events/${encodeURIComponent(params.eventId)}`}>
          ← Back to event details
        </Link>
      </div>

      <header className="dashboard-header">
        <div>
          <p className="brand-sm">Organizer</p>
          <h1 className="dashboard-title">Edit event</h1>
          <p className="lede">Draft details can change until escrow starts.</p>
        </div>
      </header>

      {state.kind === "loading" ? (
        <div className="table-wrap" aria-busy="true">
          <div className="skeleton-row" />
          <div className="skeleton-row" />
          <div className="skeleton-row" />
        </div>
      ) : null}

      {state.kind === "error" ? (
        <div className="banner banner-warn" role="alert">
          <strong>Cannot edit event.</strong> {state.message}
          <div className="org-inline-actions">
            {state.status === 404 ? (
              <Link className="btn" href="/organizer/events">
                Back to My Events
              </Link>
            ) : (
              <button type="button" className="btn" onClick={() => void load()}>
                Retry
              </button>
            )}
          </div>
        </div>
      ) : null}

      {state.kind === "ready" && !canEdit ? (
        <div className="banner banner-warn" role="alert">
          <strong>This event is no longer a draft.</strong> Only draft events can
          be edited.
          <div className="org-inline-actions">
            <Link className="btn" href={`/organizer/events/${encodeURIComponent(state.event.id)}`}>
              View event
            </Link>
          </div>
        </div>
      ) : null}

      {canEdit && initialValues ? (
        <EventForm
          mode="edit"
          initialValues={initialValues}
          submitting={submitting}
          formError={formError}
          serverFieldErrors={serverFieldErrors}
          onSubmit={handleSubmit}
          onCancel={() => router.push(`/organizer/events/${encodeURIComponent(state.event.id)}`)}
        />
      ) : null}
    </section>
  );
}
