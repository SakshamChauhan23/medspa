import type { Queue } from "bullmq";
import type { WorkflowType } from "@/lib/automation/types";

// ─── Queue names ──────────────────────────────────────────────────────────────

export const QUEUE_NAMES = {
  PMS_SYNC: "pms-sync",
  WORKFLOW_STEP: "workflow-step",   // all workflow step execution
  DAILY_TRIGGER_SCAN: "daily-trigger-scan",
} as const;

// ─── Job payloads ─────────────────────────────────────────────────────────────

export interface PMSSyncJobPayload {
  clinicId: string;
  integrationId: string;
  isFullSync: boolean;
  triggeredBy: "manual" | "scheduled" | "onboarding";
}

export interface WorkflowStepJobPayload {
  clinicId: string;
  patientId: string;
  enrollmentId: string;
  stepNumber: number;
  workflowType: WorkflowType;
}

export interface DailyTriggerScanJobPayload {
  clinicId: string;
}

// ─── Lazy queue singletons ────────────────────────────────────────────────────

let _pmsSyncQueue: Queue<PMSSyncJobPayload> | null = null;
let _workflowStepQueue: Queue<WorkflowStepJobPayload> | null = null;
let _dailyScanQueue: Queue<DailyTriggerScanJobPayload> | null = null;

async function getQueue<T>(
  name: string,
  cache: Queue<T> | null,
  setCache: (q: Queue<T>) => void
): Promise<Queue<T>> {
  if (cache) return cache;
  const { Queue: BullQueue } = await import("bullmq");
  const { getRedisConnection } = await import("./redis");
  const q = new BullQueue<T>(name, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 100 },
    },
  });
  setCache(q);
  return q;
}

// ─── Queue accessors ──────────────────────────────────────────────────────────

export async function getPmsSyncQueue() {
  return getQueue<PMSSyncJobPayload>(
    QUEUE_NAMES.PMS_SYNC, _pmsSyncQueue, (q) => { _pmsSyncQueue = q; }
  );
}

export async function getWorkflowStepQueue() {
  return getQueue<WorkflowStepJobPayload>(
    QUEUE_NAMES.WORKFLOW_STEP, _workflowStepQueue, (q) => { _workflowStepQueue = q; }
  );
}

export async function getDailyScanQueue() {
  return getQueue<DailyTriggerScanJobPayload>(
    QUEUE_NAMES.DAILY_TRIGGER_SCAN, _dailyScanQueue, (q) => { _dailyScanQueue = q; }
  );
}

// ─── Enqueue helpers ──────────────────────────────────────────────────────────

export async function enqueuePmsSync(
  payload: PMSSyncJobPayload,
  options?: { delayMs?: number; jobId?: string }
) {
  const queue = await getPmsSyncQueue();
  return queue.add(`sync:${payload.clinicId}`, payload, {
    delay: options?.delayMs,
    jobId: options?.jobId,
  });
}

export async function enqueueWorkflowStep(
  payload: WorkflowStepJobPayload,
  delayMs = 0
) {
  const queue = await getWorkflowStepQueue();
  const jobId = `wf:${payload.enrollmentId}:step${payload.stepNumber}`;
  return queue.add(jobId, payload, { delay: delayMs, jobId });
}

export async function enqueueDailyScan(clinicId: string) {
  const queue = await getDailyScanQueue();
  return queue.add(
    `daily-scan:${clinicId}`,
    { clinicId },
    { jobId: `daily-scan:${clinicId}:${new Date().toISOString().split("T")[0]}` }
  );
}
