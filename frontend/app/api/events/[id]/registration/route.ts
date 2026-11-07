import { requireApiRole } from "@backend/lib/auth";
import { jsonError } from "@backend/lib/http-error";
import {
  getRegistration,
  registerForEvent,
} from "@backend/services/participation/participation.service";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireApiRole("DEVELOPER");
    const payload = await getRegistration(params.id, session.userId);
    return NextResponse.json(payload);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireApiRole("DEVELOPER");
    const registration = await registerForEvent(params.id, session.userId);
    return NextResponse.json(registration, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
