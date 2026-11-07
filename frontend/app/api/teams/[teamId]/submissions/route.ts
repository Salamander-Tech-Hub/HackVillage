import { requireApiRole } from "@backend/lib/auth";
import { jsonError } from "@backend/lib/http-error";
import {
  formatParticipationZodError,
  submissionSchema,
} from "@backend/lib/validations/participation.schema";
import { createOrUpdateSubmission } from "@backend/services/participation/participation.service";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: { teamId: string } },
) {
  try {
    const session = await requireApiRole("DEVELOPER");
    const parsed = submissionSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(formatParticipationZodError(parsed.error), { status: 400 });
    }
    const submission = await createOrUpdateSubmission(
      params.teamId,
      session.userId,
      parsed.data,
    );
    return NextResponse.json(submission, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
