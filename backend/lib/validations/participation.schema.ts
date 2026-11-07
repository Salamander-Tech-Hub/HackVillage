import { z } from "zod";

export const createTeamSchema = z.object({
  name: z.string().trim().min(2, "Team name is required").max(80),
});

export const submissionSchema = z.object({
  title: z.string().trim().min(1, "Submission title is required").max(160),
  repo_url: z.string().url("Repository URL must be valid").optional().nullable(),
  demo_url: z.string().url("Demo URL must be valid").optional().nullable(),
});

export const updateSubmissionSchema = submissionSchema.partial();

export function formatParticipationZodError(error: z.ZodError) {
  return {
    error: {
      code: "VALIDATION_ERROR",
      message: error.errors.map((item) => item.message).join(", "),
    },
  };
}
