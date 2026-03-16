/**
 * Trigger Evaluator — Daily Cron
 *
 * Scans the patient database and enrolls eligible patients into workflows.
 * Runs once per day per clinic via a BullMQ scheduled job.
 *
 * Workflows:
 *   1. Botox Reactivation    — last_botox_date >= 90 days AND no upcoming appt
 *   2. Appointment Reminder  — appointment within 24h AND not confirmed
 *   3. Membership Retention  — membership_expiry within 30 days
 *   (Cancellation Recovery is event-driven, not scan-based)
 */

import { db } from "@/lib/db";
import {
  patients,
  treatments,
  appointments,
  workflowEnrollments,
  patientMemberships,
} from "@/lib/db/schema";
import { eq, and, lte, gte, isNull, notInArray, sql } from "drizzle-orm";
import type { WorkflowType } from "./types";

export interface TriggerResult {
  enrolled: number;
  skipped: number;
  errors: string[];
}

// ─── Main evaluator ───────────────────────────────────────────────────────────

export async function runDailyTriggerScan(clinicId: string): Promise<TriggerResult> {
  const results = await Promise.allSettled([
    scanBotoxReactivation(clinicId),
    scanAppointmentReminders(clinicId),
    scanMembershipRetention(clinicId),
  ]);

  let enrolled = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const r of results) {
    if (r.status === "fulfilled") {
      enrolled += r.value.enrolled;
      skipped += r.value.skipped;
    } else {
      errors.push(String(r.reason));
    }
  }

  return { enrolled, skipped, errors };
}

// ─── Botox Reactivation ───────────────────────────────────────────────────────
// Trigger: last botox treatment >= 90 days ago AND no upcoming scheduled appointment

async function scanBotoxReactivation(clinicId: string): Promise<TriggerResult> {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // Find patients with overdue Botox and no upcoming appointment
  const overduePatientsRaw = await db
    .select({ patientId: treatments.patientId, treatmentDate: treatments.treatmentDate })
    .from(treatments)
    .where(
      and(
        eq(treatments.clinicId, clinicId),
        sql`LOWER(${treatments.treatmentType}) LIKE '%botox%'`,
        lte(treatments.treatmentDate, ninetyDaysAgo.toISOString().split("T")[0])
      )
    );

  const result: TriggerResult = { enrolled: 0, skipped: 0, errors: [] };

  for (const row of overduePatientsRaw) {
    try {
      // Check no upcoming appointment
      const upcoming = await db
        .select({ id: appointments.id })
        .from(appointments)
        .where(
          and(
            eq(appointments.patientId, row.patientId),
            eq(appointments.clinicId, clinicId),
            eq(appointments.status, "scheduled"),
            gte(appointments.appointmentDate, new Date())
          )
        )
        .limit(1);

      if (upcoming.length > 0) {
        result.skipped++;
        continue;
      }

      const enrolled = await safeEnroll({
        clinicId,
        patientId: row.patientId,
        workflowType: "botox_reactivation",
        context: { treatmentType: "Botox" },
      });

      if (enrolled) result.enrolled++;
      else result.skipped++;
    } catch (err) {
      result.errors.push(`Botox scan patient ${row.patientId}: ${err}`);
    }
  }

  return result;
}

// ─── Appointment Reminders ────────────────────────────────────────────────────
// Trigger: appointment within the next 24 hours AND status = scheduled

async function scanAppointmentReminders(clinicId: string): Promise<TriggerResult> {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const upcoming = await db
    .select({
      id: appointments.id,
      patientId: appointments.patientId,
      appointmentDate: appointments.appointmentDate,
      treatmentType: appointments.treatmentType,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.clinicId, clinicId),
        eq(appointments.status, "scheduled"),
        gte(appointments.appointmentDate, now),
        lte(appointments.appointmentDate, in24h)
      )
    );

  const result: TriggerResult = { enrolled: 0, skipped: 0, errors: [] };

  for (const appt of upcoming) {
    try {
      const enrolled = await safeEnroll({
        clinicId,
        patientId: appt.patientId,
        workflowType: "appointment_reminder",
        context: {
          appointmentId: appt.id,
          appointmentDate: appt.appointmentDate
            ? ` on ${new Date(appt.appointmentDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
            : "",
          treatmentType: appt.treatmentType ?? "appointment",
        },
      });

      if (enrolled) result.enrolled++;
      else result.skipped++;
    } catch (err) {
      result.errors.push(`Reminder scan appt ${appt.id}: ${err}`);
    }
  }

  return result;
}

// ─── Membership Retention ─────────────────────────────────────────────────────
// Trigger: membership_expiry within the next 30 days AND status = active

async function scanMembershipRetention(clinicId: string): Promise<TriggerResult> {
  const today = new Date().toISOString().split("T")[0];
  const in30days = new Date();
  in30days.setDate(in30days.getDate() + 30);
  const in30daysStr = in30days.toISOString().split("T")[0];

  const expiring = await db
    .select({
      patientId: patientMemberships.patientId,
      membershipExpiry: patientMemberships.membershipExpiry,
      membershipName: patientMemberships.membershipName,
    })
    .from(patientMemberships)
    .where(
      and(
        eq(patientMemberships.clinicId, clinicId),
        eq(patientMemberships.status, "active"),
        gte(patientMemberships.membershipExpiry, today),
        lte(patientMemberships.membershipExpiry, in30daysStr)
      )
    );

  const result: TriggerResult = { enrolled: 0, skipped: 0, errors: [] };

  for (const m of expiring) {
    try {
      const enrolled = await safeEnroll({
        clinicId,
        patientId: m.patientId,
        workflowType: "membership_retention",
        context: {
          membershipExpiry: m.membershipExpiry ?? "",
          membershipName: m.membershipName ?? "membership",
        },
      });

      if (enrolled) result.enrolled++;
      else result.skipped++;
    } catch (err) {
      result.errors.push(`Membership scan patient ${m.patientId}: ${err}`);
    }
  }

  return result;
}

// ─── Safe enrollment with dedup ───────────────────────────────────────────────
// Returns true if enrolled, false if already active

async function safeEnroll(opts: {
  clinicId: string;
  patientId: string;
  workflowType: WorkflowType;
  context?: Record<string, string>;
}): Promise<boolean> {
  // Check for existing active/waiting enrollment (dedup)
  const existing = await db
    .select({ id: workflowEnrollments.id })
    .from(workflowEnrollments)
    .where(
      and(
        eq(workflowEnrollments.clinicId, opts.clinicId),
        eq(workflowEnrollments.patientId, opts.patientId),
        eq(workflowEnrollments.workflowType, opts.workflowType),
        notInArray(workflowEnrollments.status, ["cancelled", "completed", "failed"])
      )
    )
    .limit(1);

  if (existing.length > 0) return false;

  await db.insert(workflowEnrollments).values({
    clinicId: opts.clinicId,
    patientId: opts.patientId,
    workflowType: opts.workflowType,
    status: "pending",
    currentStep: 0,
    context: opts.context ?? {},
  });

  return true;
}

// ─── Cancellation Recovery (event-driven, not scan-based) ────────────────────
// Called directly when an appointment_cancelled event is detected

export async function enrollCancellationRecovery(opts: {
  clinicId: string;
  appointmentId: string;
  treatmentType: string | null;
  slotTime: string;
}): Promise<void> {
  // Find waitlist patients for this treatment type
  const waitlistPatients = await db
    .select({ patientId: patients.id })
    .from(patients)
    .innerJoin(
      sql`appointment_waitlist aw`,
      sql`aw.patient_id = ${patients.id} AND aw.clinic_id = ${opts.clinicId} AND aw.status = 'waiting'${opts.treatmentType ? sql` AND LOWER(aw.treatment_type) = LOWER(${opts.treatmentType})` : sql``}`
    )
    .limit(3); // Notify top 3 waitlist patients

  for (const { patientId } of waitlistPatients) {
    await safeEnroll({
      clinicId: opts.clinicId,
      patientId,
      workflowType: "cancellation_recovery",
      context: {
        appointmentId: opts.appointmentId,
        treatmentType: opts.treatmentType ?? "appointment",
        slotTime: opts.slotTime,
      },
    });
  }
}
