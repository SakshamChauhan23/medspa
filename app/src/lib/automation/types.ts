/**
 * Workflow State Machine types — per PRD recommendation.
 *
 * State transitions:
 *   pending → active (first step executes)
 *   active  → waiting (step sent, delay before next)
 *   waiting → active (delay elapsed, next step executes)
 *   active  → completed (all steps done)
 *   active | waiting → cancelled (stop condition hit)
 *   active | waiting → failed (unrecoverable error)
 */

export type WorkflowStatus = "pending" | "active" | "waiting" | "completed" | "cancelled" | "failed";

export type StopReason = "booked" | "replied_stop" | "opted_out" | "manual" | "completed" | "expired";

export type WorkflowType =
  | "botox_reactivation"
  | "appointment_reminder"
  | "cancellation_recovery"
  | "membership_retention"
  | "laser_package_completion"
  | "filler_refresh";

export interface WorkflowStep {
  stepNumber: number;
  action: "send_sms" | "send_email";
  templateKey: string;       // key into DEFAULT_TEMPLATES
  delayHours: number;        // hours to wait BEFORE this step (0 = immediate)
}

export interface WorkflowDefinition {
  type: WorkflowType;
  name: string;
  description: string;
  steps: WorkflowStep[];
  /** Module 2 only (requires Standard plan) */
  requiresStandard: boolean;
}

export interface WorkflowJobPayload {
  clinicId: string;
  patientId: string;
  enrollmentId: string;
  stepNumber: number;
  workflowType: WorkflowType;
}

export interface StopConditionResult {
  shouldStop: boolean;
  reason?: StopReason;
}
