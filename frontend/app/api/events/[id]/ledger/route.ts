import { jsonError } from "@backend/lib/http-error";
import { listEventLedger } from "@backend/services/money/ledger.service";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const ledger = await listEventLedger(params.id);
    return NextResponse.json(ledger);
  } catch (error) {
    return jsonError(error);
  }
}
