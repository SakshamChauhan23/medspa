import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pmsIntegrations } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { requireAuth, isNextResponse } from "@/lib/utils/auth";
import { enqueuePmsSync } from "@/lib/jobs/queues";

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  if (auth.role === "staff") {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 }
    );
  }

  // Find active integration
  const [integration] = await db
    .select()
    .from(pmsIntegrations)
    .where(
      and(
        eq(pmsIntegrations.clinicId, auth.clinicId),
        eq(pmsIntegrations.pmsType, "aesthetic_record")
      )
    )
    .limit(1);

  if (!integration) {
    return NextResponse.json(
      { error: "No Aesthetic Record integration found. Connect first." },
      { status: 404 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const isFullSync = body?.fullSync === true;

  await enqueuePmsSync({
    clinicId: auth.clinicId,
    integrationId: integration.id,
    isFullSync,
    triggeredBy: "manual",
  });

  return NextResponse.json({
    success: true,
    message: `${isFullSync ? "Full" : "Incremental"} sync queued. Check back shortly.`,
  });
}

export async function GET(_req: NextRequest) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  const [integration] = await db
    .select({
      id: pmsIntegrations.id,
      pmsType: pmsIntegrations.pmsType,
      syncStatus: pmsIntegrations.syncStatus,
      lastSyncedAt: pmsIntegrations.lastSyncedAt,
      errorMessage: pmsIntegrations.errorMessage,
      createdAt: pmsIntegrations.createdAt,
    })
    .from(pmsIntegrations)
    .where(
      and(
        eq(pmsIntegrations.clinicId, auth.clinicId),
        eq(pmsIntegrations.pmsType, "aesthetic_record")
      )
    )
    .limit(1);

  return NextResponse.json({ integration: integration ?? null });
}
