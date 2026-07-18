import { z } from "zod";

export const eventDraftSchema = z.object({
  title: z.string().min(1, "Title is required"),
  problem_statement: z.string().min(1, "Problem statement is required"),
  prize_total: z.number().int().nonnegative("Prize total must be a non-negative integer"),
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
});

export const updateEventDraftSchema = eventDraftSchema.partial();

export function formatZodError(error: z.ZodError) {
  return {
    error: {
      code: "VALIDATION_ERROR",
      message: error.errors.map(e => e.message).join(", ")
    }
  };
}
