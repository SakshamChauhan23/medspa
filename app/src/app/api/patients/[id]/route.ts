import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patients, treatments, appointments, optOuts } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, isNextResponse } from "@/lib/utils/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  const { id } = await params;

  const [patient] = await db
    .select()
    .from(patients)
    .where(and(eq(patients.id, id), eq(patients.clinicId, auth.clinicId)))
    .limit(1);

  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  // Fetch related data in parallel
  const [patientTreatments, patientAppointments, optOut] = await Promise.all([
    db
      .select()
      .from(treatments)
      .where(
        and(
          eq(treatments.patientId, patient.id),
          eq(treatments.clinicId, auth.clinicId)
        )
      )
      .orderBy(desc(treatments.treatmentDate)),

    db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.patientId, patient.id),
          eq(appointments.clinicId, auth.clinicId)
        )
      )
      .orderBy(desc(appointments.appointmentDate)),

    db
      .select()
      .from(optOuts)
      .where(
        and(
          eq(optOuts.patientId, patient.id),
          eq(optOuts.clinicId, auth.clinicId)
        )
      )
      .limit(1),
  ]);

  return NextResponse.json({
    patient,
    treatments: patientTreatments,
    appointments: patientAppointments,
    optOut: optOut[0] ?? null,
  });
}
