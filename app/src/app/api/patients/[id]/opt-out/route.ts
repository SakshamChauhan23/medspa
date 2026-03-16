import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patients, optOuts, events } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, isNextResponse } from "@/lib/utils/auth";
import { z } from "zod";

const optOutSchema = z.object({
  smsOptOut: z.boolean().optional(),
  emailOptOut: z.boolean().optional(),
  source: z
    .enum(["admin", "patient_request", "sms_stop_keyword", "pms_import"])
    .default("admin"),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  const { id } = await params;

  // Verify patient belongs to clinic
  const [patient] = await db
    .select({ id: patients.id, clinicId: patients.clinicId })
    .from(patients)
    .where(and(eq(patients.id, id), eq(patients.clinicId, auth.clinicId)))
    .limit(1);

  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = optOutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { smsOptOut, emailOptOut, source } = parsed.data;

  // Upsert opt-out record
  await db
    .insert(optOuts)
    .values({
      clinicId: auth.clinicId,
      patientId: patient.id,
      smsOptOut: smsOptOut ?? false,
      emailOptOut: emailOptOut ?? false,
      source,
    })
    .onConflictDoUpdate({
      target: [optOuts.patientId],
      set: {
        smsOptOut: smsOptOut ?? false,
        emailOptOut: emailOptOut ?? false,
        source,
        updatedAt: new Date(),
      },
    });

  // Mirror opt-out flags on the patient record for faster queries
  await db
    .update(patients)
    .set({
      smsOptOut: smsOptOut ?? false,
      emailOptOut: emailOptOut ?? false,
      optOutAt: smsOptOut || emailOptOut ? new Date() : null,
    })
    .where(eq(patients.id, patient.id));

  // Emit events for audit / Phase 2 automation
  const eventPromises = [];
  if (smsOptOut) {
    eventPromises.push(
      db.insert(events).values({
        clinicId: auth.clinicId,
        eventType: "opt_out_sms",
        entityType: "patient",
        entityId: patient.id,
        payload: { source },
      })
    );
  }
  if (emailOptOut) {
    eventPromises.push(
      db.insert(events).values({
        clinicId: auth.clinicId,
        eventType: "opt_out_email",
        entityType: "patient",
        entityId: patient.id,
        payload: { source },
      })
    );
  }
  await Promise.all(eventPromises);

  return NextResponse.json({ success: true });
}
