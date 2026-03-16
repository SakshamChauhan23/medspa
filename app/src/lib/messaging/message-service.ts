/**
 * Message Service — unified send + DB logging for both SMS and email.
 * Uses the provider interfaces from sms.ts and email.ts.
 * Enforces opt-out check before every send.
 */

import { db } from "@/lib/db";
import { messages, patients } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { smsProvider } from "./sms";
import { emailProvider } from "./email";
import { renderTemplate, type TemplateContext } from "./templates";

export interface SendMessageOptions {
  clinicId: string;
  patientId: string;
  channel: "sms" | "email";
  templateBody: string;
  templateSubject?: string;
  context: TemplateContext;
  enrollmentId?: string;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  skipped?: boolean;
  skipReason?: string;
  error?: string;
}

export async function sendMessage(opts: SendMessageOptions): Promise<SendMessageResult> {
  const { clinicId, patientId, channel, enrollmentId } = opts;

  // ── 1. Opt-out check — never skip this ──────────────────────────────────────
  const [patient] = await db
    .select({ phone: patients.phone, email: patients.email, smsOptOut: patients.smsOptOut, emailOptOut: patients.emailOptOut })
    .from(patients)
    .where(and(eq(patients.id, patientId), eq(patients.clinicId, clinicId)))
    .limit(1);

  if (!patient) {
    return { success: false, error: "Patient not found" };
  }

  if (channel === "sms" && patient.smsOptOut) {
    return { success: false, skipped: true, skipReason: "Patient has opted out of SMS" };
  }
  if (channel === "email" && patient.emailOptOut) {
    return { success: false, skipped: true, skipReason: "Patient has opted out of email" };
  }

  // ── 2. Render template with context ─────────────────────────────────────────
  const body = renderTemplate(opts.templateBody, opts.context);
  const subject = opts.templateSubject
    ? renderTemplate(opts.templateSubject, opts.context)
    : undefined;

  // ── 3. Send via provider ─────────────────────────────────────────────────────
  let providerMessageId: string | null = null;
  let sendError: string | undefined;

  if (channel === "sms") {
    if (!patient.phone) {
      return { success: false, skipped: true, skipReason: "Patient has no phone number" };
    }
    const result = await smsProvider.send({ to: patient.phone, body, clinicId, patientId });
    providerMessageId = result.providerMessageId;
    if (!result.success) sendError = result.error;
  } else {
    if (!patient.email) {
      return { success: false, skipped: true, skipReason: "Patient has no email address" };
    }
    const result = await emailProvider.send({
      to: patient.email,
      subject: subject ?? "(no subject)",
      text: body,
      clinicId,
      patientId,
    });
    providerMessageId = result.providerMessageId;
    if (!result.success) sendError = result.error;
  }

  // ── 4. Log to DB ─────────────────────────────────────────────────────────────
  const [logged] = await db
    .insert(messages)
    .values({
      clinicId,
      patientId,
      enrollmentId: enrollmentId ?? null,
      channel,
      direction: "outbound",
      providerMessageId,
      toAddress: channel === "sms" ? patient.phone : patient.email,
      body,
      subject: subject ?? null,
      status: sendError ? "failed" : "sent",
      sentAt: sendError ? null : new Date(),
    })
    .returning({ id: messages.id });

  if (sendError) {
    return { success: false, messageId: logged?.id, error: sendError };
  }

  return { success: true, messageId: logged?.id };
}

// ─── Log inbound message ──────────────────────────────────────────────────────

export async function logInboundMessage(opts: {
  clinicId: string;
  patientId: string | null;
  channel: "sms" | "email";
  fromAddress: string;
  body: string;
  providerMessageId: string;
  isStopKeyword: boolean;
}): Promise<string> {
  const [logged] = await db
    .insert(messages)
    .values({
      clinicId: opts.clinicId,
      patientId: opts.patientId,
      channel: opts.channel,
      direction: "inbound",
      fromAddress: opts.fromAddress,
      body: opts.body,
      providerMessageId: opts.providerMessageId,
      status: "delivered",
      isStopKeyword: opts.isStopKeyword,
      requiresStaffReply: !opts.isStopKeyword,
      sentAt: new Date(),
    })
    .returning({ id: messages.id });

  return logged.id;
}

// ─── STOP keywords per Twilio/CTIA spec ──────────────────────────────────────

const STOP_KEYWORDS = new Set([
  "stop", "stopall", "unsubscribe", "cancel", "end", "quit",
]);

export function isStopKeyword(body: string): boolean {
  return STOP_KEYWORDS.has(body.trim().toLowerCase());
}

export function isConfirmKeyword(body: string): boolean {
  return ["yes", "y", "confirm", "ok", "yeah"].includes(body.trim().toLowerCase());
}

export function isDenyKeyword(body: string): boolean {
  return ["no", "n", "cancel", "nope"].includes(body.trim().toLowerCase());
}
