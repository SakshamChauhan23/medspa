import { db } from "@/lib/db";
import {
  patients,
  treatments,
  appointments,
  pmsIntegrations,
  events,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { AestheticRecordClient } from "./client";
import type { ARPatient, ARTreatment, ARAppointment, SyncResult } from "./types";

// Treatment types that have known cycle lengths (days until next visit)
const TREATMENT_CYCLE_MAP: Record<string, number> = {
  botox: 90,
  "botox treatment": 90,
  dysport: 90,
  xeomin: 90,
  filler: 180,
  "dermal filler": 180,
  "lip filler": 180,
  kybella: 180,
  laser: 30,
  "laser hair removal": 30,
  "ipl treatment": 60,
  "chemical peel": 30,
  microneedling: 30,
  hydrafacial: 30,
};

function getCycleLength(treatmentType: string): number | null {
  const normalized = treatmentType.toLowerCase().trim();
  return TREATMENT_CYCLE_MAP[normalized] ?? null;
}

export async function syncClinicFromAR(
  clinicId: string,
  integrationId: string,
  isFullSync = false
): Promise<SyncResult> {
  const result: SyncResult = {
    patientsUpserted: 0,
    treatmentsUpserted: 0,
    appointmentsUpserted: 0,
    errors: [],
    syncedAt: new Date(),
  };

  // Get the integration record
  const [integration] = await db
    .select()
    .from(pmsIntegrations)
    .where(
      and(
        eq(pmsIntegrations.id, integrationId),
        eq(pmsIntegrations.clinicId, clinicId)
      )
    )
    .limit(1);

  if (!integration || !integration.encryptedCredentials) {
    throw new Error("Integration not found or credentials missing");
  }

  // In production: decrypt credentials from secrets manager
  // For now: parse the stored JSON credentials
  let credentials: { apiKey: string; arClinicId: string };
  try {
    credentials = JSON.parse(integration.encryptedCredentials);
  } catch {
    throw new Error("Failed to parse integration credentials");
  }

  const client = new AestheticRecordClient({
    apiKey: credentials.apiKey,
    clinicId: credentials.arClinicId,
  });

  // Mark sync as active
  await db
    .update(pmsIntegrations)
    .set({ syncStatus: "active", errorMessage: null })
    .where(eq(pmsIntegrations.id, integrationId));

  // Emit sync started event
  await db.insert(events).values({
    clinicId,
    eventType: "pms_sync_started",
    entityType: "pms_integration",
    entityId: integrationId,
    payload: { isFullSync },
  });

  try {
    // ── Step 1: Sync patients ──────────────────────────────────────────────
    for await (const batch of client.fetchPatients()) {
      await upsertPatients(clinicId, batch);
      result.patientsUpserted += batch.length;
    }

    // ── Step 2: Sync treatments ────────────────────────────────────────────
    for await (const batch of client.fetchTreatments()) {
      await upsertTreatments(clinicId, batch, result.errors);
      result.treatmentsUpserted += batch.length;
    }

    // ── Step 3: Sync appointments ──────────────────────────────────────────
    const updatedAfter = !isFullSync && integration.lastSyncedAt
      ? integration.lastSyncedAt.toISOString()
      : undefined;

    for await (const batch of client.fetchAppointments({ updatedAfter })) {
      await upsertAppointments(clinicId, batch, result.errors);
      result.appointmentsUpserted += batch.length;
    }

    // ── Update integration sync state ──────────────────────────────────────
    await db
      .update(pmsIntegrations)
      .set({
        syncStatus: "active",
        lastSyncedAt: new Date(),
        errorMessage: null,
      })
      .where(eq(pmsIntegrations.id, integrationId));

    // Emit sync completed event
    await db.insert(events).values({
      clinicId,
      eventType: "pms_sync_completed",
      entityType: "pms_integration",
      entityId: integrationId,
      payload: {
        patientsUpserted: result.patientsUpserted,
        treatmentsUpserted: result.treatmentsUpserted,
        appointmentsUpserted: result.appointmentsUpserted,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown sync error";
    result.errors.push(message);

    await db
      .update(pmsIntegrations)
      .set({ syncStatus: "error", errorMessage: message })
      .where(eq(pmsIntegrations.id, integrationId));

    await db.insert(events).values({
      clinicId,
      eventType: "pms_sync_failed",
      entityType: "pms_integration",
      entityId: integrationId,
      payload: { error: message },
    });

    throw err;
  }

  return result;
}

// ─── Upsert helpers ───────────────────────────────────────────────────────────

async function upsertPatients(
  clinicId: string,
  batch: ARPatient[]
): Promise<void> {
  if (batch.length === 0) return;

  const values = batch.map((p) => ({
    clinicId,
    externalPatientId: p.id,
    firstName: p.first_name,
    lastName: p.last_name,
    email: p.email ?? null,
    phone: p.phone ?? null,
    dateOfBirth: p.date_of_birth ?? null,
    lastSyncedAt: new Date(),
  }));

  await db
    .insert(patients)
    .values(values)
    .onConflictDoUpdate({
      target: [patients.clinicId, patients.externalPatientId],
      set: {
        firstName: values[0].firstName,
        lastName: values[0].lastName,
        email: values[0].email,
        phone: values[0].phone,
        lastSyncedAt: new Date(),
      },
    });
}

async function upsertTreatments(
  clinicId: string,
  batch: ARTreatment[],
  errors: string[]
): Promise<void> {
  for (const t of batch) {
    try {
      // Find our internal patient ID from the external AR patient ID
      const [patient] = await db
        .select({ id: patients.id })
        .from(patients)
        .where(
          and(
            eq(patients.clinicId, clinicId),
            eq(patients.externalPatientId, t.patient_id)
          )
        )
        .limit(1);

      if (!patient) {
        errors.push(
          `Treatment ${t.id}: patient ${t.patient_id} not found — skipping`
        );
        continue;
      }

      await db.insert(treatments).values({
        clinicId,
        patientId: patient.id,
        treatmentType: t.treatment_type,
        treatmentDate: t.treatment_date,
        cycleLengthDays: getCycleLength(t.treatment_type),
        provider: t.provider_name ?? null,
        notes: t.notes ?? null,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      errors.push(`Treatment ${t.id}: ${msg}`);
    }
  }
}

async function upsertAppointments(
  clinicId: string,
  batch: ARAppointment[],
  errors: string[]
): Promise<void> {
  for (const a of batch) {
    try {
      const [patient] = await db
        .select({ id: patients.id })
        .from(patients)
        .where(
          and(
            eq(patients.clinicId, clinicId),
            eq(patients.externalPatientId, a.patient_id)
          )
        )
        .limit(1);

      if (!patient) {
        errors.push(
          `Appointment ${a.id}: patient ${a.patient_id} not found — skipping`
        );
        continue;
      }

      await db
        .insert(appointments)
        .values({
          clinicId,
          patientId: patient.id,
          externalAppointmentId: a.id,
          appointmentDate: new Date(a.appointment_date),
          treatmentType: a.treatment_type ?? null,
          status: a.status,
          provider: a.provider_name ?? null,
          cancellationReason: a.cancellation_reason ?? null,
          cancelledAt: a.cancelled_at ? new Date(a.cancelled_at) : null,
        })
        .onConflictDoUpdate({
          target: [appointments.clinicId, appointments.externalAppointmentId],
          set: {
            status: a.status,
            cancellationReason: a.cancellation_reason ?? null,
            cancelledAt: a.cancelled_at ? new Date(a.cancelled_at) : null,
            updatedAt: new Date(),
          },
        });

      // Emit cancellation event for Phase 2 automation
      if (a.status === "cancelled") {
        const [appt] = await db
          .select({ id: appointments.id })
          .from(appointments)
          .where(
            and(
              eq(appointments.clinicId, clinicId),
              eq(appointments.externalAppointmentId, a.id)
            )
          )
          .limit(1);

        if (appt) {
          await db.insert(events).values({
            clinicId,
            eventType: "appointment_cancelled",
            entityType: "appointment",
            entityId: appt.id,
            payload: {
              patientId: patient.id,
              reason: a.cancellation_reason,
              cancelledAt: a.cancelled_at,
            },
          });
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      errors.push(`Appointment ${a.id}: ${msg}`);
    }
  }
}
