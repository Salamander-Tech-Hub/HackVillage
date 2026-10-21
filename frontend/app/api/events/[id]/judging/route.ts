import { requireApiRole } from "@backend/lib/auth";
import {
  assignJudgeToEvent,
  getJudgingReadinessForEvent,
  removeJudgeFromEvent,
} from "@backend/services/events/judging.service";
import { NextRequest, NextResponse } from "next/server";
import { judgingErrorResponse } from "./errors";

const MOCKS_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_MOCK_EVENTS === "true" &&
  process.env.NODE_ENV !== "production";

function getMockJudgingReadiness(eventId: string) {
  return {
    eventId,
    status: "JUDGING",
    totalSubmissions: 3,
    totalJudges: 2,
    totalReviewsRequired: 6,
    totalReviewsCompleted: 4,
    percentage: 67,
    isReadyToClose: false,
    missingReason: "Judge Amina B. has 2 pending reviews.",
    judges: [
      {
        judgeId: "judge_sk",
        name: "Sarah K.",
        email: "sarah.k@example.com",
        reviewed: 3,
        total: 3,
        pending: 0,
        isComplete: true,
      },
      {
        judgeId: "judge_ab",
        name: "Amina B.",
        email: "amina.b@example.com",
        reviewed: 1,
        total: 3,
        pending: 2,
        isComplete: false,
      },
    ],
    submissions: [
      { submissionId: "sub_1", title: "SoilSense", teamName: "Rootline", reviewed: 2, total: 2, isComplete: true },
      { submissionId: "sub_2", title: "FlowPay", teamName: "Ledgerlight", reviewed: 1, total: 2, isComplete: false },
      { submissionId: "sub_3", title: "ClinicQ", teamName: "Triage", reviewed: 1, total: 2, isComplete: false },
    ],
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireApiRole("ORGANIZER");

    if (MOCKS_ENABLED && params.id.startsWith("mock_")) {
      return NextResponse.json(getMockJudgingReadiness(params.id));
    }

    const readiness = await getJudgingReadinessForEvent(params.id, {
      organizerId: session.role === "ADMIN" ? undefined : session.userId,
    });
    return NextResponse.json(readiness);
  } catch (error) {
    return judgingErrorResponse(error);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireApiRole("ORGANIZER");
    const body = await req.json().catch(() => ({}));

    if (!body.email || typeof body.email !== "string") {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Email is required to assign a judge" } },
        { status: 400 },
      );
    }

    const readiness = await assignJudgeToEvent(params.id, session.userId, {
      email: body.email,
      name: typeof body.name === "string" ? body.name : undefined,
    });

    return NextResponse.json(readiness, { status: 201 });
  } catch (error) {
    return judgingErrorResponse(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireApiRole("ORGANIZER");
    const judgeId = req.nextUrl.searchParams.get("judgeId");

    if (!judgeId) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "judgeId is required" } },
        { status: 400 },
      );
    }

    const readiness = await removeJudgeFromEvent(params.id, session.userId, judgeId);
    return NextResponse.json(readiness);
  } catch (error) {
    return judgingErrorResponse(error);
  }
}
