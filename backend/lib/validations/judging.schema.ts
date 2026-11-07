import { z } from "zod";

export const assignJudgeSchema = z.object({
  email: z.string().trim().email("A valid judge email is required").toLowerCase(),
});

export const judgeFeedbackSchema = z.object({
  points: z.array(z.string()).min(3, "Provide at least three feedback points"),
  score: z.number().int().min(1).max(10).optional().nullable(),
});

export function formatJudgingZodError(error: z.ZodError) {
  return {
    error: {
      code: "VALIDATION_ERROR",
      message: error.errors.map((item) => item.message).join(", "),
    },
  };
}
