/**
 * BullMQ Worker
 *
 * Handles three queue types:
 *   1. pms-sync            — Aesthetic Record data sync
 *   2. workflow-step       — Execute a single automation workflow step
 *   3. daily-trigger-scan  — Run daily trigger evaluation for a clinic
 *
 * Run with: npm run worker
 * Deploy as a separate service from the Next.js web app.
 */

import { Worker, Job } from "bullmq";
import { getRedisConnection } from "./redis";
import {
  QUEUE_NAMES,
  type PMSSyncJobPayload,
  type WorkflowStepJobPayload,
  type DailyTriggerScanJobPayload,
} from "./queues";
import { syncClinicFromAR } from "@/lib/connectors/aesthetic-record";
import { executeWorkflowStep } from "@/lib/automation/step-executor";
import { runDailyTriggerScan } from "@/lib/automation/trigger-evaluator";
import { getWorkflowDefinition } from "@/lib/automation/workflows";
import { enqueueWorkflowStep } from "./queues";
import { db } from "@/lib/db";
import { workflowEnrollments, scheduledWorkflowJobs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const connection = getRedisConnection();

// ─── Worker 1: PMS Sync ───────────────────────────────────────────────────────

const pmsSyncWorker = new Worker<PMSSyncJobPayload>(
  QUEUE_NAMES.PMS_SYNC,
  async (job: Job<PMSSyncJobPayload>) => {
    const { clinicId, integrationId, isFullSync, triggeredBy } = job.data;
    console.log(`[pms-sync] Starting — clinic=${clinicId} full=${isFullSync} by=${triggeredBy}`);
    await job.updateProgress(10);

    const result = await syncClinicFromAR(clinicId, integrationId, isFullSync);
    await job.updateProgress(100);

    console.log(`[pms-sync] Done — patients=${result.patientsUpserted} treatments=${result.treatmentsUpserted} appointments=${result.appointmentsUpserted} errors=${result.errors.length}`);
    return result;
  },
  { connection, concurrency: 2 }
);

// ─── Worker 2: Workflow Step Executor ─────────────────────────────────────────

const workflowStepWorker = new Worker<WorkflowStepJobPayload>(
  QUEUE_NAMES.WORKFLOW_STEP,
  async (job: Job<WorkflowStepJobPayload>) => {
    const { clinicId, patientId, enrollmentId, stepNumber, workflowType } = job.data;
    console.log(`[workflow-step] clinic=${clinicId} enrollment=${enrollmentId} step=${stepNumber} type=${workflowType}`);

    const definition = getWorkflowDefinition(workflowType);
    if (!definition) {
      throw new Error(`Unknown workflow type: ${workflowType}`);
    }

    await executeWorkflowStep(job.data, definition);

    // After execution, check if next step needs to be enqueued
    const [enrollment] = await db
      .select({ status: workflowEnrollments.status })
      .from(workflowEnrollments)
      .where(eq(workflowEnrollments.id, enrollmentId))
      .limit(1);

    if (enrollment?.status === "waiting") {
      // Find the scheduled next step and enqueue it
      const [nextJob] = await db
        .select()
        .from(scheduledWorkflowJobs)
        .where(eq(scheduledWorkflowJobs.enrollmentId, enrollmentId))
        .orderBy(scheduledWorkflowJobs.stepNumber)
        .limit(1);

      if (nextJob?.scheduledFor && nextJob.status === "pending") {
        const delayMs = Math.max(0, nextJob.scheduledFor.getTime() - Date.now());
        const enqueuedJob = await enqueueWorkflowStep({
          clinicId,
          patientId,
          enrollmentId,
          stepNumber: nextJob.stepNumber,
          workflowType,
        }, delayMs);

        // Store BullMQ job ID for potential cancellation
        await db
          .update(scheduledWorkflowJobs)
          .set({ bullmqJobId: enqueuedJob.id ?? null })
          .where(eq(scheduledWorkflowJobs.id, nextJob.id));
      }
    }
  },
  { connection, concurrency: 5 }
);

// ─── Worker 3: Daily Trigger Scanner ─────────────────────────────────────────

const dailyScanWorker = new Worker<DailyTriggerScanJobPayload>(
  QUEUE_NAMES.DAILY_TRIGGER_SCAN,
  async (job: Job<DailyTriggerScanJobPayload>) => {
    const { clinicId } = job.data;
    console.log(`[daily-scan] Running trigger scan for clinic=${clinicId}`);

    const result = await runDailyTriggerScan(clinicId);

    console.log(`[daily-scan] Done — enrolled=${result.enrolled} skipped=${result.skipped} errors=${result.errors.length}`);

    // After scanning, enqueue Step 1 for all newly pending enrollments
    const pendingEnrollments = await db
      .select()
      .from(workflowEnrollments)
      .where(eq(workflowEnrollments.status, "pending"))
      .limit(500);

    for (const enrollment of pendingEnrollments) {
      const enqueuedJob = await enqueueWorkflowStep({
        clinicId: enrollment.clinicId,
        patientId: enrollment.patientId,
        enrollmentId: enrollment.id,
        stepNumber: 1,
        workflowType: enrollment.workflowType,
      });

      // Record the BullMQ job ID
      await db.insert(scheduledWorkflowJobs).values({
        clinicId: enrollment.clinicId,
        enrollmentId: enrollment.id,
        stepNumber: 1,
        bullmqJobId: enqueuedJob.id ?? null,
        scheduledFor: new Date(),
        status: "pending",
      }).onConflictDoNothing();
    }

    return result;
  },
  { connection, concurrency: 1 }
);

// ─── Error handlers ───────────────────────────────────────────────────────────

for (const [name, worker] of [
  ["pms-sync", pmsSyncWorker],
  ["workflow-step", workflowStepWorker],
  ["daily-scan", dailyScanWorker],
] as const) {
  worker.on("completed", (job) => console.log(`[${name}] Job ${job.id} completed`));
  worker.on("failed", (job, err) => console.error(`[${name}] Job ${job?.id} failed: ${err.message}`));
  worker.on("error", (err) => console.error(`[${name}] Worker error: ${err.message}`));
}

// ─── Graceful shutdown ────────────────────────────────────────────────────────

async function shutdown() {
  console.log("[worker] Shutting down gracefully...");
  await Promise.all([
    pmsSyncWorker.close(),
    workflowStepWorker.close(),
    dailyScanWorker.close(),
  ]);
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

console.log("[worker] All workers started — pms-sync, workflow-step, daily-trigger-scan");
