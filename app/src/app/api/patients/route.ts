import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patients, treatments, appointments, optOuts } from "@/lib/db/schema";
import { eq, and, ilike, or, desc, count, sql } from "drizzle-orm";
import { requireAuth, isNextResponse } from "@/lib/utils/auth";
import { z } from "zod";

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  const { searchParams } = req.nextUrl;
  const query = listQuerySchema.safeParse({
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
    search: searchParams.get("search") ?? undefined,
  });

  if (!query.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: query.error.flatten() },
      { status: 400 }
    );
  }

  const { page, limit, search } = query.data;
  const offset = (page - 1) * limit;

  const where = search
    ? and(
        eq(patients.clinicId, auth.clinicId),
        or(
          ilike(patients.firstName, `%${search}%`),
          ilike(patients.lastName, `%${search}%`),
          ilike(patients.email, `%${search}%`),
          ilike(patients.phone, `%${search}%`)
        )
      )
    : eq(patients.clinicId, auth.clinicId);

  // Get patients with their most recent appointment and treatment counts
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: patients.id,
        firstName: patients.firstName,
        lastName: patients.lastName,
        email: patients.email,
        phone: patients.phone,
        smsOptOut: patients.smsOptOut,
        emailOptOut: patients.emailOptOut,
        createdAt: patients.createdAt,
        // Subquery: most recent appointment date
        lastAppointment: sql<string>`(
          SELECT MAX(appointment_date)::text
          FROM appointments a
          WHERE a.patient_id = ${patients.id}
          AND a.clinic_id = ${auth.clinicId}
        )`,
        // Subquery: total treatment count
        treatmentCount: sql<number>`(
          SELECT COUNT(*)
          FROM treatments t
          WHERE t.patient_id = ${patients.id}
          AND t.clinic_id = ${auth.clinicId}
        )`,
      })
      .from(patients)
      .where(where)
      .orderBy(desc(patients.createdAt))
      .limit(limit)
      .offset(offset),

    db
      .select({ total: count() })
      .from(patients)
      .where(where),
  ]);

  return NextResponse.json({
    data: rows,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}
