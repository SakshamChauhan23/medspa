import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messages, patients } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, isNextResponse } from "@/lib/utils/auth";
import { sendMessage } from "@/lib/messaging/message-service";
import { z } from "zod";

// GET /api/messages/thread/[patientId] — full message thread for a patient
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  const { patientId } = await params;

  // Verify patient belongs to clinic
  const [patient] = await db
    .select({ id: patients.id, firstName: patients.firstName, lastName: patients.lastName })
    .from(patients)
    .where(and(eq(patients.id, patientId), eq(patients.clinicId, auth.clinicId)))
    .limit(1);

  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const thread = await db
    .select()
    .from(messages)
    .where(
      and(eq(messages.patientId, patientId), eq(messages.clinicId, auth.clinicId))
    )
    .orderBy(desc(messages.createdAt))
    .limit(100);

  return NextResponse.json({ patient, messages: thread });
}

// POST /api/messages/thread/[patientId] — staff reply to patient
const replySchema = z.object({
  body: z.string().min(1).max(1600),
  channel: z.enum(["sms", "email"]).default("sms"),
  subject: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  const { patientId } = await params;

  const [patient] = await db
    .select({ id: patients.id, firstName: patients.firstName, clinicId: patients.clinicId })
    .from(patients)
    .where(and(eq(patients.id, patientId), eq(patients.clinicId, auth.clinicId)))
    .limit(1);

  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = replySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const result = await sendMessage({
    clinicId: auth.clinicId,
    patientId,
    channel: parsed.data.channel,
    templateBody: parsed.data.body,   // staff replies are not templated
    templateSubject: parsed.data.subject,
    context: {
      patient_name: patient.firstName ?? "Patient",
      clinic_name: "Your Clinic",
    },
  });

  // Mark inbound messages from this patient as resolved
  await db
    .update(messages)
    .set({ requiresStaffReply: false, resolvedAt: new Date() })
    .where(
      and(
        eq(messages.patientId, patientId),
        eq(messages.clinicId, auth.clinicId),
        eq(messages.requiresStaffReply, true)
      )
    );

  return NextResponse.json({ success: result.success, messageId: result.messageId });
}
