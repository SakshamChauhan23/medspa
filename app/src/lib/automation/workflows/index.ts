import type { WorkflowDefinition } from "../types";

// ─── Workflow 1: Botox Reactivation ──────────────────────────────────────────
// PRD: SMS Day 0 → Email Day 2 → Final SMS Day 5
// Module 1 (Starter plan)

export const BOTOX_REACTIVATION: WorkflowDefinition = {
  type: "botox_reactivation",
  name: "Botox Reactivation",
  description: "Reactivates patients overdue for Botox (90+ days). Sends SMS → Email → Final SMS.",
  requiresStandard: false,
  steps: [
    {
      stepNumber: 1,
      action: "send_sms",
      templateKey: "sms_step1",
      delayHours: 0,        // immediate on enrollment
    },
    {
      stepNumber: 2,
      action: "send_email",
      templateKey: "email_step2",
      delayHours: 48,       // 2 days
    },
    {
      stepNumber: 3,
      action: "send_sms",
      templateKey: "sms_step3",
      delayHours: 72,       // 3 more days (5 days total from step 1)
    },
  ],
};

// ─── Workflow 2: Appointment Reminder ────────────────────────────────────────
// PRD: 24h SMS reminder → 20h wait → confirmation request ("Reply YES")
// Module 2 (Standard plan)

export const APPOINTMENT_REMINDER: WorkflowDefinition = {
  type: "appointment_reminder",
  name: "Appointment Reminder",
  description: "24h reminder + confirmation request. Reduces no-shows via YES/NO reply parsing.",
  requiresStandard: true,
  steps: [
    {
      stepNumber: 1,
      action: "send_sms",
      templateKey: "sms_step1",
      delayHours: 0,
    },
    {
      stepNumber: 2,
      action: "send_sms",
      templateKey: "sms_step2",
      delayHours: 20,       // 20 hours later
    },
    {
      stepNumber: 3,
      action: "send_sms",
      templateKey: "sms_followup",
      delayHours: 3,        // 3 hours if still no reply
    },
  ],
};

// ─── Workflow 3: Cancellation Recovery ───────────────────────────────────────
// PRD: Slot available SMS to top 3 waitlist patients, first YES gets slot
// Module 2 (Standard plan) — event-driven, not scan-based

export const CANCELLATION_RECOVERY: WorkflowDefinition = {
  type: "cancellation_recovery",
  name: "Cancellation Recovery",
  description: "Notifies waitlist patients when a slot opens. First reply gets the slot.",
  requiresStandard: true,
  steps: [
    {
      stepNumber: 1,
      action: "send_sms",
      templateKey: "sms_step1",
      delayHours: 0,        // immediate on cancellation detection
    },
  ],
};

// ─── Workflow 4: Membership Retention ────────────────────────────────────────
// PRD: 30d email → 7d SMS → Final day SMS
// Module 1 (Starter plan)

export const MEMBERSHIP_RETENTION: WorkflowDefinition = {
  type: "membership_retention",
  name: "Membership Retention",
  description: "Renewal reminders 30 days before expiry. Email → SMS → Final SMS.",
  requiresStandard: false,
  steps: [
    {
      stepNumber: 1,
      action: "send_email",
      templateKey: "email_step1",
      delayHours: 0,
    },
    {
      stepNumber: 2,
      action: "send_sms",
      templateKey: "sms_step2",
      delayHours: 23 * 24,  // ~23 days later (7 days before expiry)
    },
    {
      stepNumber: 3,
      action: "send_sms",
      templateKey: "sms_step3",
      delayHours: 7 * 24,   // 7 more days (final day)
    },
  ],
};

// ─── Registry ─────────────────────────────────────────────────────────────────

export const WORKFLOW_REGISTRY: Record<string, WorkflowDefinition> = {
  botox_reactivation: BOTOX_REACTIVATION,
  appointment_reminder: APPOINTMENT_REMINDER,
  cancellation_recovery: CANCELLATION_RECOVERY,
  membership_retention: MEMBERSHIP_RETENTION,
};

export function getWorkflowDefinition(type: string): WorkflowDefinition | null {
  return WORKFLOW_REGISTRY[type] ?? null;
}
