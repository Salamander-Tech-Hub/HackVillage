import { verifyPaystackSignature } from "@backend/lib/paystack";
import { processPaystackEvent } from "@backend/services/money/webhook.service";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!verifyPaystackSignature(rawBody, signature)) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid Paystack signature." } },
      { status: 401 },
    );
  }

  let payload: { id?: string; event?: string; data?: Record<string, unknown> };
  try {
    payload = JSON.parse(rawBody) as typeof payload;
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid webhook payload." } },
      { status: 400 },
    );
  }

  const result = await processPaystackEvent(payload);
  return NextResponse.json(result);
}
