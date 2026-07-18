"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EventForm, type EventFormValues } from "@/components/organizer/EventForm";
import { createEvent, OrganizerApiError } from "@/lib/organizerApi";
import type { FieldErrorMap } from "@/lib/types";

const INITIAL_VALUES: EventFormValues = {
  title: "",
  problemStatement: "",
  prizePoolKes: "",
  startsAt: "",
  endsAt: "",
};

export default function OrganizerCreateEventPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [serverFieldErrors, setServerFieldErrors] = useState<FieldErrorMap | undefined>();

  async function handleSubmit(payload: {
    title: string;
    problemStatement: string;
    prizePoolKes: number;
    startsAt: string;
    endsAt: string;
  }) {
    if (submitting) return;

    try {
      setSubmitting(true);
      setFormError(null);
      setServerFieldErrors(undefined);

      const created = await createEvent(payload);
      router.push(`/organizer/events/${encodeURIComponent(created.id)}?created=1`);
      router.refresh();
    } catch (error) {
      if (error instanceof OrganizerApiError) {
        setFormError(error.message);
        setServerFieldErrors(error.fieldErrors);
      } else {
        setFormError("Unexpected error while saving draft event.");
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
          <p className="lede">Create a draft event. You can edit details before escrow verification.</p>
        </div>
      </header>

      <EventForm
        mode="create"
        initialValues={INITIAL_VALUES}
        submitting={submitting}
        formError={formError}
        serverFieldErrors={serverFieldErrors}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/organizer/events")}
      />
    </section>
  );
}
