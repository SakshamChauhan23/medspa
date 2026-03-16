/**
 * Step Executor
 *
 * Executes a single workflow step for a patient enrollment.
 * Flow:
 *   1. Check stop conditions
 *   2. Fetch patient + clinic context
 *   3. Render template
 *   4. Send message
 *   5. Update enrollment state
 *   6. Schedule next step (if any)
 */

import { db } from "@/lib/db";
import { workflowEnrollments, scheduledWorkflowJobs, workflowResults, patients, clinics } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { sendMessage } from "@/lib/messaging/message-service";
import { DEFAULT_TEMPLATES } from "@/lib/messaging/templates";
import { checkStopConditions, cancelEnrollment } from "./stop-checker";
import type { WorkflowJobPayload, WorkflowDefinition } from "./types";

export async function executeWorkflowStep(
  payload: WorkflowJobPayload,
  definition: WorkflowDefinition
): Promise<void> {
  const { clinicId, patientId, enrollmentId, stepNumber } = payload;

  // ── 1. Load enrollment ───────────────────────────────────────────────────────
  const [enrollment] = await db
    .select()
    .from(workflowEnrollments)
    .where(eq(workflowEnrollments.id, enrollmentId))
    .limit(1);

  if (!enrollment || enrollment.status === "cancelled" || enrollment.status === "completed") {
    console.log(`[executor] Enrollment ${enrollmentId} already ${enrollment?.status ?? "missing"} — skipping`);
    return;
  }

  // ── 2. Stop condition check ──────────────────────────────────────────────────
  const stopResult = await checkStopConditions({
    clinicId,
    patientId,
    enrollmentId,
    workflowType: payload.workflowType,
    enrolledAt: enrollment.enrolledAt!,
  });

  if (stopResult.shouldStop) {
    console.log(`[executor] Stop condition hit for enrollment ${enrollmentId}: ${stopResult.reason}`);
    await cancelEnrollment({ enrollmentId, reason: stopResult.reason });

    // Record result
    await db.insert(workflowResults).values({
      clinicId,
      enrollmentId,
      patientId,
      workflowType: payload.workflowType,
      result: stopResult.reason === "booked" ? "booked" : "cancelled_stop",
    });
    return;
  }

  // ── 3. Find the step definition ──────────────────────────────────────────────
  const step = definition.steps.find((s) => s.stepNumber === stepNumber);
  if (!step) {
    console.error(`[executor] Step ${stepNumber} not found in workflow ${payload.workflowType}`);
    return;
  }

  // ── 4. Build template context ────────────────────────────────────────────────
  const [patient, clinic] = await Promise.all([
    db.select({ firstName: patients.firstName, lastName: patients.lastName }).from(patients).where(eq(patients.id, patientId)).limit(1),
    db.select({ name: clinics.name }).from(clinics).where(eq(clinics.id, clinicId)).limit(1),
  ]);

  const context = {
    patient_name: [patient[0]?.firstName, patient[0]?.lastName].filter(Boolean).join(" ") || "there",
    clinic_name: clinic[0]?.name ?? "your clinic",
    booking_link: `https://book.${clinic[0]?.name?.toLowerCase().replace(/\s+/g, "")}.com`,
    treatment_type: (enrollment.context as Record<string, string>)?.treatmentType ?? "treatment",
    appointment_date: (enrollment.context as Record<string, string>)?.appointmentDate ?? "",
    membership_expiry: (enrollment.context as Record<string, string>)?.membershipExpiry ?? "",
    slot_time: (enrollment.context as Record<string, string>)?.slotTime ?? "today",
  };

  // ── 5. Resolve template body ─────────────────────────────────────────────────
  const templateData = resolveTemplate(payload.workflowType, step.templateKey, step.action);
  if (!templateData) {
    console.error(`[executor] Template not found: ${step.templateKey}`);
    return;
  }

  // ── 6. Send message ──────────────────────────────────────────────────────────
  await db
    .update(workflowEnrollments)
    .set({ status: "active", currentStep: stepNumber, lastStepAt: new Date() })
    .where(eq(workflowEnrollments.id, enrollmentId));

  const sendResult = await sendMessage({
    clinicId,
    patientId,
    channel: step.action === "send_sms" ? "sms" : "email",
    templateBody: templateData.body,
    templateSubject: templateData.subject,
    context,
    enrollmentId,
  });

  // Mark this job as executed
  await db
    .update(scheduledWorkflowJobs)
    .set({ status: sendResult.success ? "sent" : "failed", executedAt: new Date() })
    .where(
      and(
        eq(scheduledWorkflowJobs.enrollmentId, enrollmentId),
        eq(scheduledWorkflowJobs.stepNumber, stepNumber)
      )
    );

  // ── 7. Schedule next step or complete ────────────────────────────────────────
  const nextStep = definition.steps.find((s) => s.stepNumber === stepNumber + 1);

  if (!nextStep) {
    // All steps done
    await db
      .update(workflowEnrollments)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(workflowEnrollments.id, enrollmentId));

    await db.insert(workflowResults).values({
      clinicId,
      enrollmentId,
      patientId,
      workflowType: payload.workflowType,
      result: "sequence_completed",
    });
    return;
  }

  // Queue next step after delay
  await db
    .update(workflowEnrollments)
    .set({ status: "waiting" })
    .where(eq(workflowEnrollments.id, enrollmentId));

  // The actual BullMQ enqueue happens in the workflow job handler in worker.ts
  // Here we just record the pending job in the DB
  const scheduledFor = new Date(Date.now() + nextStep.delayHours * 60 * 60 * 1000);
  await db.insert(scheduledWorkflowJobs).values({
    clinicId,
    enrollmentId,
    stepNumber: nextStep.stepNumber,
    scheduledFor,
    status: "pending",
  });
}

// ─── Template resolver ────────────────────────────────────────────────────────

function resolveTemplate(
  workflowType: string,
  templateKey: string,
  action: string
): { body: string; subject?: string } | null {
  const wf = DEFAULT_TEMPLATES[workflowType as keyof typeof DEFAULT_TEMPLATES];
  if (!wf) return null;
  const tpl = (wf as Record<string, { body: string; subject?: string }>)[templateKey];
  return tpl ?? null;
}
