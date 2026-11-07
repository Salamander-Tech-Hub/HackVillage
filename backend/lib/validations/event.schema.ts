import { z } from "zod";

export const eventFormatSchema = z.enum(["IN_PERSON", "VIRTUAL", "HYBRID"]);

export const eventDraftSchema = z.object({
  title: z.string().min(1, "Title is required"),
  problem_statement: z.string().min(1, "Problem statement is required"),
  prize_total: z.number().int().nonnegative("Prize total must be a non-negative integer"),
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
  location: z.string().max(200).optional().nullable(),
  format: eventFormatSchema.optional().nullable(),
});

export const updateEventDraftSchema = eventDraftSchema.partial();

export const lifecycleActionSchema = z.enum([
  "START_ESCROW",
  "VERIFY_ESCROW",
  "PUBLISH",
  "START_JUDGING",
  "CLOSE",
  "ARCHIVE",
]);

export const eventTransitionSchema = z.object({
  action: lifecycleActionSchema,
});

export function formatZodError(error: z.ZodError) {
  return {
    error: {
      code: "VALIDATION_ERROR",
      message: error.errors.map((e) => e.message).join(", "),
    },
  };
}
