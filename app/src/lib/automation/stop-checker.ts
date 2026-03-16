/**
 * Stop Condition Checker
 *
 * Runs before EVERY workflow step executes.
 * If any condition is true, the enrollment is cancelled and no message is sent.
 *
 * Conditions per PRD:
 *   1. Patient booked an appointment
 *   2. Patient replied STOP (opted out)
 *   3. Patient manually opted out
 */

import { db } from "@/lib/db";
import { patients, appointments, workflowEnrollments } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";
import type { StopConditionResult, WorkflowType } from "./types";

export async function checkStopConditions(opts: {
  clinicId: string;
  patientId: string;
  enrollmentId: string;
  workflowType: WorkflowType;
  enrolledAt: Date;
}): Promise<StopConditionResult> {
  const { clinicId, patientId, enrollmentId, enrolledAt } = opts;

  // Run checks in parallel for speed
  const [patient, newAppointment, enrollment] = await Promise.all([
    // Check opt-out status
    db
      .select({ smsOptOut: patients.smsOptOut, emailOptOut: patients.emailOptOut })
      .from(patients)
      .where(and(eq(patients.id, patientId), eq(patients.clinicId, clinicId)))
      .limit(1),

    // Check if patient booked an appointment AFTER enrollment started
    db
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          eq(appointments.patientId, patientId),
          eq(appointments.clinicId, clinicId),
          eq(appointments.status, "scheduled"),
          gt(appointments.createdAt, enrolledAt)
        )
      )
      .limit(1),

    // Check enrollment still active (not manually cancelled)
    db
      .select({ status: workflowEnrollments.status })
      .from(workflowEnrollments)
      .where(eq(workflowEnrollments.id, enrollmentId))
      .limit(1),
  ]);

  // Enrollment was manually cancelled
  if (!enrollment[0] || enrollment[0].status === "cancelled") {
    return { shouldStop: true, reason: "manual" };
  }

  // Patient opted out of SMS (primary channel)
  if (patient[0]?.smsOptOut) {
    return { shouldStop: true, reason: "opted_out" };
  }

  // Patient booked after enrollment — mission accomplished
  if (newAppointment.length > 0) {
    return { shouldStop: true, reason: "booked" };
  }

  return { shouldStop: false };
}

/**
 * Cancel all pending workflow jobs for an enrollment.
 * Called when a stop condition is detected.
 */
export async function cancelEnrollment(opts: {
  enrollmentId: string;
  reason: StopConditionResult["reason"];
}): Promise<void> {
  const { enrollmentId, reason } = opts;

  await db
    .update(workflowEnrollments)
    .set({
      status: "cancelled",
      stopReason: reason ?? "manual",
      stoppedAt: new Date(),
    })
    .where(eq(workflowEnrollments.id, enrollmentId));

  // Mark all pending scheduled jobs as cancelled
  const { scheduledWorkflowJobs } = await import("@/lib/db/schema");
  await db
    .update(scheduledWorkflowJobs)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(scheduledWorkflowJobs.enrollmentId, enrollmentId),
        eq(scheduledWorkflowJobs.status, "pending")
      )
    );

  // Note: BullMQ job removal happens in the worker via bullmqJobId
  // Skipped here since stub mode — add job.remove() in Phase 2 real implementation
}
