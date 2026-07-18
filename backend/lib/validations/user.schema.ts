import { z } from "zod";

export const patchUserSchema = z.object({
  github_handle: z.string().min(1, "GitHub handle is required").max(100),
});

export function formatZodError(error: z.ZodError) {
  return {
    error: {
      code: "VALIDATION_ERROR",
      message: error.errors.map(e => e.message).join(", ")
    }
  };
}
