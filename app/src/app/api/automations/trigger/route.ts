import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isNextResponse } from "@/lib/utils/auth";
import { enqueueDailyScan } from "@/lib/jobs/queues";

// POST /api/automations/trigger — manually trigger the daily scan for this clinic
export async function POST(_req: NextRequest) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  if (auth.role === "staff") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  await enqueueDailyScan(auth.clinicId);

  return NextResponse.json({
    success: true,
    message: "Trigger scan queued. New eligible patients will be enrolled in workflows.",
  });
}
