"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  parseEventForm,
  type EventFormValues,
} from "@/lib/eventForm";
import type { EventFormInput, FieldErrorMap } from "@/lib/types";

type EventFormProps = {
  mode: "create" | "edit";
  initialValues: EventFormValues;
  submitting: boolean;
  formError?: string | null;
  serverFieldErrors?: FieldErrorMap;
  onSubmit: (payload: EventFormInput) => Promise<void>;
  onCancel: () => void;
};

export function EventForm({
  mode,
  initialValues,
  submitting,
  formError,
  serverFieldErrors,
  onSubmit,
  onCancel,
}: EventFormProps) {
  const [values, setValues] = useState<EventFormValues>(initialValues);
  const [errors, setErrors] = useState<FieldErrorMap>({});

  const mergedErrors = useMemo(
    () => ({ ...(serverFieldErrors ?? {}), ...errors }),
    [errors, serverFieldErrors],
  );

  function updateField<K extends keyof EventFormValues>(name: K, value: EventFormValues[K]) {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = parseEventForm(values);
    if (!validation.ok) {
      setErrors(validation.errors);
      focusFirstInvalid(validation.errors);
      return;
    }

    setErrors({});
    await onSubmit(validation.data);
  }

  return (
    <form className="org-form" onSubmit={handleSubmit} noValidate>
      <div className="org-form-grid">
        <FieldBlock label="Title" htmlFor="title" required error={mergedErrors.title}>
          <input
            id="title"
            name="title"
            className="org-input"
            placeholder="e.g. Nairobi Climate Sprint"
            value={values.title}
            onChange={(e) => updateField("title", e.target.value)}
            aria-invalid={Boolean(mergedErrors.title)}
            maxLength={120}
            disabled={submitting}
          />
        </FieldBlock>

        <FieldBlock
          label="Prize pool (KES)"
          htmlFor="prizePoolKes"
          required
          error={mergedErrors.prizePoolKes}
          hint="Whole Kenyan shillings reserved for winner payouts."
        >
          <input
            id="prizePoolKes"
            name="prizePoolKes"
            type="number"
            min="0"
            step="1"
            className="org-input"
            placeholder="500000"
            value={values.prizePoolKes}
            onChange={(e) => updateField("prizePoolKes", e.target.value)}
            aria-invalid={Boolean(mergedErrors.prizePoolKes)}
            disabled={submitting}
          />
        </FieldBlock>

        <FieldBlock
          label="Start date and time"
          htmlFor="startsAt"
          error={mergedErrors.startsAt}
          hint="Optional while drafting. Required before you can start escrow."
        >
          <input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            className="org-input"
            value={values.startsAt}
            onChange={(e) => updateField("startsAt", e.target.value)}
            aria-invalid={Boolean(mergedErrors.startsAt)}
            disabled={submitting}
          />
        </FieldBlock>

        <FieldBlock
          label="End date and time"
          htmlFor="endsAt"
          error={mergedErrors.endsAt}
          hint="Must be after the start. Required before you can start escrow."
        >
          <input
            id="endsAt"
            name="endsAt"
            type="datetime-local"
            className="org-input"
            value={values.endsAt}
            onChange={(e) => updateField("endsAt", e.target.value)}
            aria-invalid={Boolean(mergedErrors.endsAt)}
            disabled={submitting}
          />
        </FieldBlock>

        <FieldBlock label="Location" htmlFor="location" error={mergedErrors.location}>
          <input
            id="location"
            name="location"
            className="org-input"
            placeholder="e.g. Nairobi Garage"
            value={values.location}
            onChange={(e) => updateField("location", e.target.value)}
            maxLength={200}
            disabled={submitting}
          />
        </FieldBlock>

        <FieldBlock label="Format" htmlFor="format" error={mergedErrors.format}>
          <select
            id="format"
            name="format"
            className="org-input"
            value={values.format}
            onChange={(e) =>
              updateField("format", e.target.value as EventFormValues["format"])
            }
            disabled={submitting}
          >
            <option value="">Not set</option>
            <option value="IN_PERSON">In person</option>
            <option value="VIRTUAL">Virtual</option>
            <option value="HYBRID">Hybrid</option>
          </select>
        </FieldBlock>
      </div>

      <FieldBlock
        label="Problem statement"
        htmlFor="problemStatement"
        required
        error={mergedErrors.problemStatement}
        hint="Describe the challenge participants should solve."
      >
        <textarea
          id="problemStatement"
          name="problemStatement"
          className="org-input org-textarea"
          placeholder="Describe the event challenge and expected outcomes..."
          value={values.problemStatement}
          onChange={(e) => updateField("problemStatement", e.target.value)}
          aria-invalid={Boolean(mergedErrors.problemStatement)}
          rows={8}
          maxLength={2000}
          disabled={submitting}
        />
      </FieldBlock>

      {formError ? (
        <div className="banner banner-warn" role="alert">
          <strong>Could not save event.</strong> {formError}
        </div>
      ) : null}

      <div className="org-form-actions">
        <button type="submit" className="btn primary" disabled={submitting}>
          {submitting ? "Saving..." : mode === "create" ? "Save draft" : "Save changes"}
        </button>
        <button type="button" className="btn" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function FieldBlock({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="org-field">
      <label className="org-label" htmlFor={htmlFor}>
        {label}
        {required ? <span className="org-required"> *</span> : null}
      </label>
      {hint ? <p className="org-hint">{hint}</p> : null}
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="org-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function focusFirstInvalid(errors: FieldErrorMap) {
  const fields = [
    "title",
    "prizePoolKes",
    "startsAt",
    "endsAt",
    "location",
    "format",
    "problemStatement",
  ];
  const first = fields.find((key) => Boolean(errors[key]));
  if (!first) return;
  const element = document.getElementById(first);
  if (element instanceof HTMLElement) {
    element.focus();
  }
}
