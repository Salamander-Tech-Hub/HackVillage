import type { EventFormInput, FieldErrorMap } from "@/lib/types";

export type EventFormValues = {
  title: string;
  problemStatement: string;
  prizePoolKes: string;
  startsAt: string;
  endsAt: string;
  location: string;
  format: "" | "IN_PERSON" | "VIRTUAL" | "HYBRID";
};

export type EventFormParseResult =
  | { ok: true; data: EventFormInput }
  | { ok: false; errors: FieldErrorMap };

export function parseEventForm(values: EventFormValues): EventFormParseResult {
  const errors: FieldErrorMap = {};
  const title = values.title.trim();
  const problemStatement = values.problemStatement.trim();
  const location = values.location.trim();
  const prizeRaw = values.prizePoolKes.trim();
  const prizePoolKes = Number(prizeRaw);

  if (!title) {
    errors.title = "Title is required.";
  }

  if (!problemStatement) {
    errors.problemStatement = "Problem statement is required.";
  }

  if (!prizeRaw) {
    errors.prizePoolKes = "Prize pool is required.";
  } else if (!Number.isInteger(prizePoolKes) || prizePoolKes < 0) {
    errors.prizePoolKes = "Prize pool must be a whole number of 0 or more.";
  }

  const hasStart = Boolean(values.startsAt);
  const hasEnd = Boolean(values.endsAt);
  let startsAt: string | null = null;
  let endsAt: string | null = null;

  if (hasStart || hasEnd) {
    if (!hasStart) {
      errors.startsAt = "Add a start time, or clear the end time.";
    } else {
      const startDate = new Date(values.startsAt);
      if (Number.isNaN(startDate.getTime())) {
        errors.startsAt = "Enter a valid start date and time.";
      } else {
        startsAt = startDate.toISOString();
      }
    }

    if (!hasEnd) {
      errors.endsAt = "Add an end time, or clear the start time.";
    } else {
      const endDate = new Date(values.endsAt);
      if (Number.isNaN(endDate.getTime())) {
        errors.endsAt = "Enter a valid end date and time.";
      } else {
        endsAt = endDate.toISOString();
      }
    }

    if (startsAt && endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      errors.endsAt = "End time must be after the start time.";
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      title,
      problemStatement,
      prizePoolKes,
      startsAt,
      endsAt,
      location: location || null,
      format: values.format || null,
    },
  };
}

export function toDateTimeLocal(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function emptyEventFormValues(): EventFormValues {
  return {
    title: "",
    problemStatement: "",
    prizePoolKes: "",
    startsAt: "",
    endsAt: "",
    location: "",
    format: "",
  };
}

export function eventToFormValues(event: {
  title: string;
  problemStatement: string | null;
  prizePoolKes: number;
  startsAt: string | null;
  endsAt: string | null;
  location: string | null;
  format: EventFormValues["format"] | null;
}): EventFormValues {
  return {
    title: event.title,
    problemStatement: event.problemStatement ?? "",
    prizePoolKes: String(event.prizePoolKes),
    startsAt: toDateTimeLocal(event.startsAt),
    endsAt: toDateTimeLocal(event.endsAt),
    location: event.location ?? "",
    format: event.format ?? "",
  };
}
