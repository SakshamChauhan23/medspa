/**
 * Twilio Inbound SMS Webhook
 *
 * Receives inbound patient SMS replies.
 * Handles:
 *   - STOP keywords → instant opt-out + cancel all pending workflow jobs
 *   - YES → appointment confirmation
 *   - Any reply → cancel active workflow enrollment (stop condition)
 *
 * In stub mode: the provider's verifyWebhook() always returns true.
 * In production: swap to TwilioSmsProvider which does HMAC-SHA1 verification.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  patients,
  workflowEnrollments,
  appointments,
  messages,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { logInboundMessage, isStopKeyword, isConfirmKeyword } from "@/lib/messaging/message-service";
import { cancelEnrollment } from "@/lib/automation/stop-checker";
import { smsProvider } from "@/lib/messaging/sms";

export async function POST(req: NextRequest) {
  // Parse Twilio's URL-encoded webhook body
  const body = await req.text();
  const params = new URLSearchParams(body);

  const from = params.get("From") ?? "";
  const msgBody = params.get("Body")?.trim() ?? "";
  const messageSid = params.get("MessageSid") ?? `stub_${Date.now()}`;
  const to = params.get("To") ?? ""; // clinic's Twilio number

  // ── 1. Verify webhook signature (stub always passes) ──────────────────────
  const signature = req.headers.get("x-twilio-signature") ?? "";
  const url = req.url;
  const isValid = smsProvider.verifyWebhook(body, signature, url);
  if (!isValid) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // ── 2. Find clinic by Twilio number (stub: match by phone number) ─────────
  // In production: look up clinic by their assigned Twilio number
  // For now: find patient by phone across all clinics
  const matchedPatients = await db
    .select({ id: patients.id, clinicId: patients.clinicId })
    .from(patients)
    .where(eq(patients.phone, from))
    .limit(1);

  const patient = matchedPatients[0] ?? null;

  const isStop = isStopKeyword(msgBody);
  const isConfirm = isConfirmKeyword(msgBody);

  // ── 3. Log the inbound message ────────────────────────────────────────────
  await logInboundMessage({
    clinicId: patient?.clinicId ?? "unknown",
    patientId: patient?.id ?? null,
    channel: "sms",
    fromAddress: from,
    body: msgBody,
    providerMessageId: messageSid,
    isStopKeyword: isStop,
  });

  if (!patient) {
    // Unknown sender — log and ignore
    return new NextResponse("<?xml version='1.0'?><Response/>", {
      headers: { "Content-Type": "text/xml" },
    });
  }

  const { id: patientId, clinicId } = patient;

  // ── 4. STOP handling — MUST be instantaneous ─────────────────────────────
  if (isStop) {
    await db
      .update(patients)
      .set({ smsOptOut: true, optOutAt: new Date() })
      .where(eq(patients.id, patientId));

    // Cancel all active/waiting workflow enrollments for this patient
    const activeEnrollments = await db
      .select({ id: workflowEnrollments.id })
      .from(workflowEnrollments)
      .where(
        and(
          eq(workflowEnrollments.patientId, patientId),
          eq(workflowEnrollments.clinicId, clinicId)
        )
      );

    for (const enrollment of activeEnrollments) {
      await cancelEnrollment({ enrollmentId: enrollment.id, reason: "replied_stop" });
    }

    console.log(`[twilio-webhook] STOP received from ${from} — patient ${patientId} opted out`);
  }

  // ── 5. YES / confirmation handling ───────────────────────────────────────
  else if (isConfirm) {
    // Find the most recent appointment_reminder enrollment for this patient
    const [reminderEnrollment] = await db
      .select()
      .from(workflowEnrollments)
      .where(
        and(
          eq(workflowEnrollments.patientId, patientId),
          eq(workflowEnrollments.workflowType, "appointment_reminder"),
          eq(workflowEnrollments.clinicId, clinicId)
        )
      )
      .orderBy(workflowEnrollments.enrolledAt)
      .limit(1);

    if (reminderEnrollment) {
      const apptId = (reminderEnrollment.context as Record<string, string>)?.appointmentId;

      if (apptId) {
        await db
          .update(appointments)
          .set({ status: "confirmed" })
          .where(eq(appointments.id, apptId));
      }

      // Cancel the reminder workflow — patient confirmed
      await cancelEnrollment({
        enrollmentId: reminderEnrollment.id,
        reason: "booked",
      });

      console.log(`[twilio-webhook] YES received from ${from} — appointment confirmed`);
    }
  }

  // ── 6. Any reply stops active reactivation workflows (they responded) ────
  else {
    const [activeReactivation] = await db
      .select({ id: workflowEnrollments.id })
      .from(workflowEnrollments)
      .where(
        and(
          eq(workflowEnrollments.patientId, patientId),
          eq(workflowEnrollments.workflowType, "botox_reactivation"),
          eq(workflowEnrollments.clinicId, clinicId)
        )
      )
      .limit(1);

    if (activeReactivation) {
      await cancelEnrollment({
        enrollmentId: activeReactivation.id,
        reason: "replied_stop",
      });
    }
  }

  // Twilio expects TwiML response — empty response = no auto-reply
  return new NextResponse("<?xml version='1.0'?><Response/>", {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
