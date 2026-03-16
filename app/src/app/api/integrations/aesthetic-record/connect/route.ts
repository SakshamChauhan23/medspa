import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pmsIntegrations } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { requireAuth, isNextResponse } from "@/lib/utils/auth";
import { AestheticRecordClient } from "@/lib/connectors/aesthetic-record";
import { enqueuePmsSync } from "@/lib/jobs/queues";
import { z } from "zod";

const connectSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  arClinicId: z.string().min(1, "Aesthetic Record Clinic ID is required"),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  // Only owners and admins can connect integrations
  if (auth.role === "staff") {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const parsed = connectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { apiKey, arClinicId } = parsed.data;

  // Verify the credentials are valid before saving
  const client = new AestheticRecordClient({ apiKey, clinicId: arClinicId });
  const verification = await client.verifyConnection();

  if (!verification.valid) {
    return NextResponse.json(
      { error: verification.error ?? "Invalid credentials" },
      { status: 422 }
    );
  }

  // Store credentials (in production: encrypt before storing or use a secrets manager)
  // For MVP: store as JSON — replace with encryption in production
  const encryptedCredentials = JSON.stringify({ apiKey, arClinicId });

  const [integration] = await db
    .insert(pmsIntegrations)
    .values({
      clinicId: auth.clinicId,
      pmsType: "aesthetic_record",
      encryptedCredentials,
      syncStatus: "pending",
    })
    .onConflictDoUpdate({
      target: [pmsIntegrations.clinicId, pmsIntegrations.pmsType],
      set: {
        encryptedCredentials,
        syncStatus: "pending",
        errorMessage: null,
        updatedAt: new Date(),
      },
    })
    .returning();

  // Trigger initial full sync as a background job
  await enqueuePmsSync({
    clinicId: auth.clinicId,
    integrationId: integration.id,
    isFullSync: true,
    triggeredBy: "onboarding",
  });

  return NextResponse.json({
    success: true,
    integrationId: integration.id,
    message:
      "Connected successfully. Patient data sync has started in the background.",
  });
}
