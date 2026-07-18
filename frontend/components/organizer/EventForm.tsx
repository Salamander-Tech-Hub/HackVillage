"use client";

import { useMemo, useState } from "react";
import { parseCreateDraftInput } from "@/lib/eventDraftSchema";
import type { DraftEventInput, FieldErrorMap } from "@/lib/types";

export type EventFormMode = "create" | "edit";

export type EventFormValues = {
  title: string;
  problemStatement: string;
  prizePoolKes: string;
  startsAt: string;
  endsAt: string;
};

type EventFormProps = {
  mode: EventFormMode;
  initialValues: EventFormValues;
  submitting: boolean;
  formError?: string | null;
  serverFieldErrors?: FieldErrorMap;
  onSubmit: (payload: DraftEventInput) => Promise<void>;
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

  function updateField(name: keyof EventFormValues, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = {
      title: values.title,
      problemStatement: values.problemStatement,
      prizePoolKes: Number(values.prizePoolKes),
      startsAt: new Date(values.startsAt).toISOString(),
      endsAt: new Date(values.endsAt).toISOString(),
    };

    const validation = parseCreateDraftInput(payload);
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
        <FieldBlock
          label="Title"
          htmlFor="title"
          required
          error={mergedErrors.title}
          hint="What is the name of this event?"
        >
          <input
            id="title"
            name="title"
            className="org-input"
            placeholder="e.g. Nairobi Climate Sprint"
            value={values.title}
            onChange={(e) => updateField("title", e.target.value)}
            aria-invalid={Boolean(mergedErrors.title)}
            aria-describedby={mergedErrors.title ? "title-error" : undefined}
            maxLength={120}
            disabled={submitting}
          />
        </FieldBlock>

        <FieldBlock
          label="Prize pool (KES)"
          htmlFor="prizePoolKes"
          required
          error={mergedErrors.prizePoolKes}
          hint="Amount reserved for winner payouts."
        >
          <input
            id="prizePoolKes"
            name="prizePoolKes"
            type="number"
            min="0"
            step="0.01"
            className="org-input"
            placeholder="500000"
            value={values.prizePoolKes}
            onChange={(e) => updateField("prizePoolKes", e.target.value)}
            aria-invalid={Boolean(mergedErrors.prizePoolKes)}
            aria-describedby={mergedErrors.prizePoolKes ? "prizePoolKes-error" : undefined}
            disabled={submitting}
          />
        </FieldBlock>

        <FieldBlock
          label="Start date and time"
          htmlFor="startsAt"
          required
          error={mergedErrors.startsAt}
          hint="Use your local timezone; value is stored in UTC."
        >
          <input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            className="org-input"
            value={values.startsAt}
            onChange={(e) => updateField("startsAt", e.target.value)}
            aria-invalid={Boolean(mergedErrors.startsAt)}
            aria-describedby={mergedErrors.startsAt ? "startsAt-error" : undefined}
            disabled={submitting}
          />
        </FieldBlock>

        <FieldBlock
          label="End date and time"
          htmlFor="endsAt"
          required
          error={mergedErrors.endsAt}
          hint="Must be later than the start time."
        >
          <input
            id="endsAt"
            name="endsAt"
            type="datetime-local"
            className="org-input"
            value={values.endsAt}
            onChange={(e) => updateField("endsAt", e.target.value)}
            aria-invalid={Boolean(mergedErrors.endsAt)}
            aria-describedby={mergedErrors.endsAt ? "endsAt-error" : undefined}
            disabled={submitting}
          />
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
          aria-describedby={
            mergedErrors.problemStatement ? "problemStatement-error" : undefined
          }
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

      {mergedErrors.form ? (
        <div className="banner banner-warn" role="alert">
          {mergedErrors.form}
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
  children: React.ReactNode;
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
  const fields = ["title", "prizePoolKes", "startsAt", "endsAt", "problemStatement", "form"];
  const first = fields.find((key) => Boolean(errors[key]));
  if (!first || first === "form") return;
  const element = document.getElementById(first);
  if (element instanceof HTMLElement) {
    element.focus();
  }
}

export function toDateTimeLocal(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num: number) => String(num).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
