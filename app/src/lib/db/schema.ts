import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  date,
  integer,
  numeric,
  pgEnum,
  jsonb,
  inet,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", ["owner", "admin", "staff"]);

export const pmsTypeEnum = pgEnum("pms_type", [
  "aesthetic_record",
  "jane_app",
  "mindbody",
  "boulevard",
  "vagaro",
]);

export const syncStatusEnum = pgEnum("sync_status", [
  "pending",
  "active",
  "paused",
  "error",
]);

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "scheduled",
  "confirmed",
  "cancelled",
  "no_show",
  "completed",
]);

export const eventTypeEnum = pgEnum("event_type", [
  "patient_synced",
  "treatment_completed",
  "appointment_cancelled",
  "appointment_confirmed",
  "appointment_no_show",
  "botox_due",
  "filler_due",
  "laser_package_incomplete",
  "membership_expiring",
  "opt_out_sms",
  "opt_out_email",
  "opt_in_sms",
  "opt_in_email",
  "pms_sync_started",
  "pms_sync_completed",
  "pms_sync_failed",
]);

// ─── Clinics ──────────────────────────────────────────────────────────────────

export const clinics = pgTable("clinics", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }),
  timezone: varchar("timezone", { length: 100 }).default("America/New_York"),
  slug: varchar("slug", { length: 100 }).unique(),
  isActive: boolean("is_active").default(true),
  setupCompletedAt: timestamp("setup_completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    clerkUserId: varchar("clerk_user_id", { length: 255 }).notNull().unique(),
    email: varchar("email", { length: 255 }).notNull(),
    fullName: varchar("full_name", { length: 255 }),
    role: userRoleEnum("role").notNull().default("staff"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [index("users_clinic_id_idx").on(t.clinicId)]
);

// ─── PMS Integrations ─────────────────────────────────────────────────────────

export const pmsIntegrations = pgTable(
  "pms_integrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    pmsType: pmsTypeEnum("pms_type").notNull(),
    // Credentials are stored as a reference to a secrets manager key — never plaintext
    credentialsRef: varchar("credentials_ref", { length: 255 }),
    // For storing API keys encrypted at the application layer
    encryptedCredentials: text("encrypted_credentials"),
    syncStatus: syncStatusEnum("sync_status").default("pending"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    // Cursor/token for incremental sync (structure varies per PMS)
    syncCursor: jsonb("sync_cursor"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("pms_integrations_clinic_id_idx").on(t.clinicId),
    uniqueIndex("pms_integrations_clinic_pms_unique").on(
      t.clinicId,
      t.pmsType
    ),
  ]
);

// ─── Patients (PHI) ───────────────────────────────────────────────────────────

export const patients = pgTable(
  "patients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    // External ID from the PMS
    externalPatientId: varchar("external_patient_id", { length: 255 }).notNull(),
    firstName: varchar("first_name", { length: 100 }),
    lastName: varchar("last_name", { length: 100 }),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 20 }),
    dateOfBirth: date("date_of_birth"),
    // Communication preferences
    smsOptOut: boolean("sms_opt_out").default(false),
    emailOptOut: boolean("email_opt_out").default(false),
    optOutAt: timestamp("opt_out_at", { withTimezone: true }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("patients_clinic_id_idx").on(t.clinicId),
    uniqueIndex("patients_clinic_external_unique").on(
      t.clinicId,
      t.externalPatientId
    ),
  ]
);

// ─── Treatments ───────────────────────────────────────────────────────────────

export const treatments = pgTable(
  "treatments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    treatmentType: varchar("treatment_type", { length: 255 }).notNull(),
    treatmentDate: date("treatment_date"),
    // Expected days until next treatment (e.g. 90 for Botox)
    cycleLengthDays: integer("cycle_length_days"),
    provider: varchar("provider", { length: 255 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("treatments_clinic_patient_idx").on(t.clinicId, t.patientId),
    index("treatments_treatment_date_idx").on(t.treatmentDate),
  ]
);

// ─── Appointments ─────────────────────────────────────────────────────────────

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    externalAppointmentId: varchar("external_appointment_id", {
      length: 255,
    }),
    appointmentDate: timestamp("appointment_date", {
      withTimezone: true,
    }).notNull(),
    treatmentType: varchar("treatment_type", { length: 255 }),
    status: appointmentStatusEnum("status").default("scheduled"),
    provider: varchar("provider", { length: 255 }),
    cancellationReason: text("cancellation_reason"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("appointments_clinic_patient_idx").on(t.clinicId, t.patientId),
    index("appointments_date_idx").on(t.appointmentDate),
    index("appointments_status_idx").on(t.clinicId, t.status),
    uniqueIndex("appointments_clinic_external_unique").on(
      t.clinicId,
      t.externalAppointmentId
    ),
  ]
);

// ─── Opt-Outs ─────────────────────────────────────────────────────────────────

export const optOuts = pgTable(
  "opt_outs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" })
      .unique(),
    smsOptOut: boolean("sms_opt_out").default(false),
    emailOptOut: boolean("email_opt_out").default(false),
    // Source: "sms_stop_keyword" | "admin" | "pms_import" | "patient_request"
    source: varchar("source", { length: 50 }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [index("opt_outs_clinic_patient_idx").on(t.clinicId, t.patientId)]
);

// ─── Events Table (Phase 2 automation triggers) ───────────────────────────────
// Added in Phase 1 as advised — automations in Phase 2 will read from this table

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    eventType: eventTypeEnum("event_type").notNull(),
    // The entity this event is about (patient, appointment, etc.)
    entityId: uuid("entity_id"),
    entityType: varchar("entity_type", { length: 50 }),
    // Arbitrary JSON payload for event-specific data
    payload: jsonb("payload"),
    // Whether this event has been processed by the automation engine
    processed: boolean("processed").default(false),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("events_clinic_type_idx").on(t.clinicId, t.eventType),
    index("events_processed_idx").on(t.processed, t.createdAt),
    index("events_entity_idx").on(t.clinicId, t.entityId),
  ]
);

// ─── Audit Logs (HIPAA) ───────────────────────────────────────────────────────

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id").references(() => clinics.id, {
      onDelete: "set null",
    }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 255 }).notNull(),
    resourceType: varchar("resource_type", { length: 100 }),
    resourceId: uuid("resource_id"),
    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("audit_logs_clinic_idx").on(t.clinicId, t.occurredAt),
    index("audit_logs_user_idx").on(t.userId),
  ]
);

// ─── Relations ────────────────────────────────────────────────────────────────

export const clinicsRelations = relations(clinics, ({ many }) => ({
  users: many(users),
  pmsIntegrations: many(pmsIntegrations),
  patients: many(patients),
  events: many(events),
  auditLogs: many(auditLogs),
}));

export const usersRelations = relations(users, ({ one }) => ({
  clinic: one(clinics, { fields: [users.clinicId], references: [clinics.id] }),
}));

export const pmsIntegrationsRelations = relations(
  pmsIntegrations,
  ({ one }) => ({
    clinic: one(clinics, {
      fields: [pmsIntegrations.clinicId],
      references: [clinics.id],
    }),
  })
);

export const patientsRelations = relations(patients, ({ one, many }) => ({
  clinic: one(clinics, {
    fields: [patients.clinicId],
    references: [clinics.id],
  }),
  treatments: many(treatments),
  appointments: many(appointments),
  optOut: one(optOuts),
}));

export const treatmentsRelations = relations(treatments, ({ one }) => ({
  clinic: one(clinics, {
    fields: [treatments.clinicId],
    references: [clinics.id],
  }),
  patient: one(patients, {
    fields: [treatments.patientId],
    references: [patients.id],
  }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  clinic: one(clinics, {
    fields: [appointments.clinicId],
    references: [clinics.id],
  }),
  patient: one(patients, {
    fields: [appointments.patientId],
    references: [patients.id],
  }),
}));

export const optOutsRelations = relations(optOuts, ({ one }) => ({
  clinic: one(clinics, {
    fields: [optOuts.clinicId],
    references: [clinics.id],
  }),
  patient: one(patients, {
    fields: [optOuts.patientId],
    references: [patients.id],
  }),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  clinic: one(clinics, {
    fields: [events.clinicId],
    references: [clinics.id],
  }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 2 TABLES
// ─────────────────────────────────────────────────────────────────────────────

// ─── Enums (Phase 2) ──────────────────────────────────────────────────────────

export const messageChannelEnum = pgEnum("message_channel", ["sms", "email"]);
export const messageDirectionEnum = pgEnum("message_direction", ["outbound", "inbound"]);
export const messageStatusEnum = pgEnum("message_status", [
  "queued", "sent", "delivered", "failed", "replied",
]);

export const workflowTypeEnum = pgEnum("workflow_type", [
  "botox_reactivation",
  "appointment_reminder",
  "cancellation_recovery",
  "membership_retention",
  "laser_package_completion",
  "filler_refresh",
]);

export const workflowStepActionEnum = pgEnum("workflow_step_action", [
  "send_sms", "send_email", "wait", "check_stop",
]);

// State machine states per PRD recommendation
export const enrollmentStatusEnum = pgEnum("enrollment_status", [
  "pending", "active", "waiting", "completed", "cancelled", "failed",
]);

export const stopReasonEnum = pgEnum("stop_reason", [
  "booked", "replied_stop", "opted_out", "manual", "completed", "expired",
]);

export const planTierEnum = pgEnum("plan_tier", ["starter", "standard"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active", "past_due", "cancelled", "trialing",
]);

export const membershipStatusEnum = pgEnum("membership_status", [
  "active", "expired", "cancelled", "pending_renewal",
]);

// ─── Message Templates ────────────────────────────────────────────────────────

export const messageTemplates = pgTable(
  "message_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id").references(() => clinics.id, { onDelete: "cascade" }),
    // null = global system default
    workflowType: workflowTypeEnum("workflow_type"),
    stepNumber: integer("step_number"),
    name: varchar("name", { length: 255 }).notNull(),
    channel: messageChannelEnum("channel").notNull(),
    subject: varchar("subject", { length: 500 }), // email only
    // Supports tokens: {{patient_name}}, {{clinic_name}}, {{treatment_type}}, {{booking_link}}
    body: text("body").notNull(),
    isDefault: boolean("is_default").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [index("message_templates_clinic_idx").on(t.clinicId)]
);

// ─── Messages (outbound + inbound log) ───────────────────────────────────────

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id").references(() => patients.id, { onDelete: "set null" }),
    enrollmentId: uuid("enrollment_id"), // FK to workflow_enrollments (set after insert)
    channel: messageChannelEnum("channel").notNull(),
    direction: messageDirectionEnum("direction").notNull(),
    providerMessageId: varchar("provider_message_id", { length: 255 }),
    fromAddress: varchar("from_address", { length: 255 }),
    toAddress: varchar("to_address", { length: 255 }),
    body: text("body"),
    subject: varchar("subject", { length: 500 }),
    status: messageStatusEnum("status").default("queued"),
    // True if the inbound message was a STOP/UNSUBSCRIBE keyword
    isStopKeyword: boolean("is_stop_keyword").default(false),
    // True if staff needs to manually reply
    requiresStaffReply: boolean("requires_staff_reply").default(false),
    // True if staff marked thread resolved
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("messages_clinic_patient_idx").on(t.clinicId, t.patientId),
    index("messages_direction_idx").on(t.clinicId, t.direction),
    index("messages_requires_reply_idx").on(t.clinicId, t.requiresStaffReply),
  ]
);

// ─── Workflow Enrollments ─────────────────────────────────────────────────────
// One row per patient per workflow run — tracks the state machine

export const workflowEnrollments = pgTable(
  "workflow_enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    workflowType: workflowTypeEnum("workflow_type").notNull(),
    // State machine: pending → active → waiting → completed | cancelled | failed
    status: enrollmentStatusEnum("status").default("pending"),
    currentStep: integer("current_step").default(0),
    stopReason: stopReasonEnum("stop_reason"),
    // Arbitrary context data (e.g. which appointment triggered this)
    context: jsonb("context"),
    enrolledAt: timestamp("enrolled_at", { withTimezone: true }).defaultNow(),
    lastStepAt: timestamp("last_step_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    stoppedAt: timestamp("stopped_at", { withTimezone: true }),
  },
  (t) => [
    index("enrollments_clinic_patient_idx").on(t.clinicId, t.patientId),
    index("enrollments_status_idx").on(t.clinicId, t.status),
    index("enrollments_workflow_type_idx").on(t.clinicId, t.workflowType),
    // Prevent duplicate active enrollments for same patient + workflow
    uniqueIndex("enrollments_active_unique").on(
      t.clinicId, t.patientId, t.workflowType, t.status
    ),
  ]
);

// ─── Scheduled Workflow Jobs ──────────────────────────────────────────────────
// Tracks each BullMQ job so we can cancel pending steps when stop conditions hit

export const scheduledWorkflowJobs = pgTable(
  "scheduled_workflow_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => workflowEnrollments.id, { onDelete: "cascade" }),
    stepNumber: integer("step_number").notNull(),
    bullmqJobId: varchar("bullmq_job_id", { length: 255 }),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    status: varchar("status", { length: 50 }).default("pending"),
    // pending | sent | cancelled | failed
    executedAt: timestamp("executed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("sched_jobs_enrollment_idx").on(t.enrollmentId),
    index("sched_jobs_bullmq_idx").on(t.bullmqJobId),
  ]
);

// ─── Workflow Results (conversion tracking) ───────────────────────────────────

export const workflowResults = pgTable(
  "workflow_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    enrollmentId: uuid("enrollment_id")
      .references(() => workflowEnrollments.id, { onDelete: "set null" }),
    patientId: uuid("patient_id").references(() => patients.id, { onDelete: "set null" }),
    workflowType: workflowTypeEnum("workflow_type").notNull(),
    // "booked" | "no_response" | "opted_out" | "cancelled" etc.
    result: varchar("result", { length: 100 }).notNull(),
    // Revenue recovered estimate (booked appointment value)
    revenueEstimate: numeric("revenue_estimate", { precision: 10, scale: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("workflow_results_clinic_idx").on(t.clinicId, t.workflowType),
    index("workflow_results_date_idx").on(t.clinicId, t.createdAt),
  ]
);

// ─── Patient Memberships ──────────────────────────────────────────────────────

export const patientMemberships = pgTable(
  "patient_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    externalMembershipId: varchar("external_membership_id", { length: 255 }),
    membershipName: varchar("membership_name", { length: 255 }),
    status: membershipStatusEnum("status").default("active"),
    membershipExpiry: date("membership_expiry"),
    renewalPrice: numeric("renewal_price", { precision: 10, scale: 2 }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("memberships_clinic_patient_idx").on(t.clinicId, t.patientId),
    index("memberships_expiry_idx").on(t.clinicId, t.membershipExpiry),
    index("memberships_status_idx").on(t.clinicId, t.status),
  ]
);

// ─── Appointment Waitlist ─────────────────────────────────────────────────────

export const appointmentWaitlist = pgTable(
  "appointment_waitlist",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    treatmentType: varchar("treatment_type", { length: 255 }),
    // "waiting" | "offered" | "booked" | "expired"
    status: varchar("status", { length: 50 }).default("waiting"),
    addedAt: timestamp("added_at", { withTimezone: true }).defaultNow(),
    offeredAt: timestamp("offered_at", { withTimezone: true }),
    bookedAt: timestamp("booked_at", { withTimezone: true }),
  },
  (t) => [
    index("waitlist_clinic_idx").on(t.clinicId, t.status),
    index("waitlist_treatment_idx").on(t.clinicId, t.treatmentType),
  ]
);

// ─── Clinic Subscriptions (Stripe) ───────────────────────────────────────────

export const clinicSubscriptions = pgTable(
  "clinic_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" })
      .unique(),
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
    stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
    planTier: planTierEnum("plan_tier").notNull().default("starter"),
    status: subscriptionStatusEnum("status").default("trialing"),
    setupFeeWaived: boolean("setup_fee_waived").default(false),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [index("subscriptions_clinic_idx").on(t.clinicId)]
);

// ─── Phase 2 Relations ────────────────────────────────────────────────────────

export const workflowEnrollmentsRelations = relations(workflowEnrollments, ({ one, many }) => ({
  clinic: one(clinics, { fields: [workflowEnrollments.clinicId], references: [clinics.id] }),
  patient: one(patients, { fields: [workflowEnrollments.patientId], references: [patients.id] }),
  scheduledJobs: many(scheduledWorkflowJobs),
  results: many(workflowResults),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  clinic: one(clinics, { fields: [messages.clinicId], references: [clinics.id] }),
  patient: one(patients, { fields: [messages.patientId], references: [patients.id] }),
}));

export const patientMembershipsRelations = relations(patientMemberships, ({ one }) => ({
  clinic: one(clinics, { fields: [patientMemberships.clinicId], references: [clinics.id] }),
  patient: one(patients, { fields: [patientMemberships.patientId], references: [patients.id] }),
}));

export const clinicSubscriptionsRelations = relations(clinicSubscriptions, ({ one }) => ({
  clinic: one(clinics, { fields: [clinicSubscriptions.clinicId], references: [clinics.id] }),
}));

// ─── Type exports ─────────────────────────────────────────────────────────────

export type Clinic = typeof clinics.$inferSelect;
export type NewClinic = typeof clinics.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
export type Treatment = typeof treatments.$inferSelect;
export type NewTreatment = typeof treatments.$inferInsert;
export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
export type OptOut = typeof optOuts.$inferSelect;
export type PmsIntegration = typeof pmsIntegrations.$inferSelect;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type MessageTemplate = typeof messageTemplates.$inferSelect;
export type WorkflowEnrollment = typeof workflowEnrollments.$inferSelect;
export type NewWorkflowEnrollment = typeof workflowEnrollments.$inferInsert;
export type WorkflowResult = typeof workflowResults.$inferSelect;
export type PatientMembership = typeof patientMemberships.$inferSelect;
export type AppointmentWaitlistEntry = typeof appointmentWaitlist.$inferSelect;
export type ClinicSubscription = typeof clinicSubscriptions.$inferSelect;
