import { z } from "zod";
import type { DraftEventInput, DraftEventPatchInput, FieldErrorMap } from "@/lib/types";

const TITLE_MIN = 3;
const TITLE_MAX = 120;
const PROBLEM_MIN = 10;
const PROBLEM_MAX = 2000;

const titleSchema = z
  .string()
  .transform((value) => value.trim())
  .refine((value) => value.length >= TITLE_MIN, {
    message: `Title must be at least ${TITLE_MIN} characters`,
  })
  .refine((value) => value.length <= TITLE_MAX, {
    message: `Title must be at most ${TITLE_MAX} characters`,
  });

const problemSchema = z
  .string()
  .transform((value) => value.trim())
  .refine((value) => value.length >= PROBLEM_MIN, {
    message: `Problem statement must be at least ${PROBLEM_MIN} characters`,
  })
  .refine((value) => value.length <= PROBLEM_MAX, {
    message: `Problem statement must be at most ${PROBLEM_MAX} characters`,
  });

const prizeSchema = z
  .coerce.number()
  .finite("Prize pool must be a valid number")
  .min(0, "Prize pool cannot be negative")
  .max(999999999999.99, "Prize pool value is too large")
  .refine((value) => Number(value.toFixed(2)) === value, {
    message: "Prize pool must have at most 2 decimal places",
  });

const dateTimeSchema = z
  .string()
  .min(1, "Date and time are required")
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Invalid date/time format",
  });

export const createDraftEventSchema = z
  .object({
    title: titleSchema,
    problemStatement: problemSchema,
    prizePoolKes: prizeSchema,
    startsAt: dateTimeSchema,
    endsAt: dateTimeSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (new Date(value.endsAt).getTime() <= new Date(value.startsAt).getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End time must be after start time",
        path: ["endsAt"],
      });
    }
  });

export const patchDraftEventSchema = z
  .object({
    title: titleSchema.optional(),
    problemStatement: problemSchema.optional(),
    prizePoolKes: prizeSchema.optional(),
    startsAt: dateTimeSchema.optional(),
    endsAt: dateTimeSchema.optional(),
  })
  .strict();

export function validateMergedSchedule(input: {
  startsAt: string;
  endsAt: string;
}): FieldErrorMap {
  const errors: FieldErrorMap = {};
  const startMs = Date.parse(input.startsAt);
  const endMs = Date.parse(input.endsAt);

  if (Number.isNaN(startMs)) {
    errors.startsAt = "Invalid date/time format";
  }
  if (Number.isNaN(endMs)) {
    errors.endsAt = "Invalid date/time format";
  }
  if (!errors.startsAt && !errors.endsAt && endMs <= startMs) {
    errors.endsAt = "End time must be after start time";
  }

  return errors;
}

export function mapZodErrors(error: z.ZodError): FieldErrorMap {
  const errors: FieldErrorMap = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "form";
    if (!errors[key]) {
      errors[key] = issue.message;
    }
  }
  return errors;
}

export function parseCreateDraftInput(value: unknown): {
  ok: true;
  data: DraftEventInput;
} | {
  ok: false;
  errors: FieldErrorMap;
} {
  const parsed = createDraftEventSchema.safeParse(value);
  if (!parsed.success) {
    return { ok: false, errors: mapZodErrors(parsed.error) };
  }
  return { ok: true, data: parsed.data };
}

export function parsePatchDraftInput(value: unknown): {
  ok: true;
  data: DraftEventPatchInput;
} | {
  ok: false;
  errors: FieldErrorMap;
} {
  const parsed = patchDraftEventSchema.safeParse(value);
  if (!parsed.success) {
    return { ok: false, errors: mapZodErrors(parsed.error) };
  }

  if (Object.keys(parsed.data).length === 0) {
    return {
      ok: false,
      errors: { form: "At least one field is required to update this event" },
    };
  }

  return { ok: true, data: parsed.data };
}
