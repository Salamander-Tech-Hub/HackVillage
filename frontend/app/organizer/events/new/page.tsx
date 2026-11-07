"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EventForm } from "@/components/organizer/EventForm";
import { emptyEventFormValues } from "@/lib/eventForm";
import { createEvent, OrganizerApiError } from "@/lib/organizerApi";
import type { EventFormInput, FieldErrorMap } from "@/lib/types";

export default function OrganizerCreateEventPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [serverFieldErrors, setServerFieldErrors] = useState<FieldErrorMap>();

  async function handleSubmit(payload: EventFormInput) {
    if (submitting) return;

    try {
      setSubmitting(true);
      setFormError(null);
      setServerFieldErrors(undefined);
      const created = await createEvent(payload);
      router.push(`/organizer/events/${encodeURIComponent(created.id)}`);
      router.refresh();
    } catch (error) {
      if (error instanceof OrganizerApiError) {
        setFormError(error.message);
      } else {
        setFormError("Unexpected error while saving the draft event.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="org-panel" aria-live="polite">
      <div className="org-inline-actions">
        <Link className="btn" href="/organizer/events">
          ← Back to My Events
        </Link>
      </div>

      <header className="dashboard-header">
        <div>
          <p className="brand-sm">Organizer</p>
          <h1 className="dashboard-title">Create event</h1>
          <p className="lede">
            Save a draft first. Escrow and publishing stay blocked until the event is ready.
          </p>
        </div>
      </header>

      <EventForm
        mode="create"
        initialValues={emptyEventFormValues()}
        submitting={submitting}
        formError={formError}
        serverFieldErrors={serverFieldErrors}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/organizer/events")}
      />
    </section>
  );
}
