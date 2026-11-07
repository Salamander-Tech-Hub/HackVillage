import { requireApiRole } from "@backend/lib/auth";
import { jsonError } from "@backend/lib/http-error";
import {
  formatParticipationZodError,
  updateSubmissionSchema,
} from "@backend/lib/validations/participation.schema";
import { updateSubmission } from "@backend/services/participation/participation.service";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { submissionId: string } },
) {
  try {
    const session = await requireApiRole("DEVELOPER");
    const parsed = updateSubmissionSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(formatParticipationZodError(parsed.error), { status: 400 });
    }
    const submission = await updateSubmission(
      params.submissionId,
      session.userId,
      parsed.data,
    );
    return NextResponse.json(submission);
  } catch (error) {
    return jsonError(error);
  }
}
