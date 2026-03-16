import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clinics } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { runDailyTriggerScan } from "@/lib/automation/trigger-evaluator";

// GET /api/cron/daily-scan
// Called by Vercel Cron (configure in vercel.json) or any external scheduler.
// Protected by a shared secret to prevent unauthorized triggering.
//
// vercel.json example:
// {
//   "crons": [{ "path": "/api/cron/daily-scan", "schedule": "0 9 * * *" }]
// }
// Set CRON_SECRET in Vercel env vars and add it to .env.local.

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Run scan for all active clinics that have completed setup
  const activeClinics = await db
    .select({ id: clinics.id, name: clinics.name })
    .from(clinics)
    .where(eq(clinics.isActive, true));

  const results: Array<{ clinicId: string; enrolled: number; skipped: number; errors: string[] }> = [];

  for (const clinic of activeClinics) {
    try {
      const result = await runDailyTriggerScan(clinic.id);
      results.push({ clinicId: clinic.id, ...result });
    } catch (err) {
      results.push({
        clinicId: clinic.id,
        enrolled: 0,
        skipped: 0,
        errors: [String(err)],
      });
    }
  }

  const totalEnrolled = results.reduce((s, r) => s + r.enrolled, 0);
  const totalErrors = results.flatMap((r) => r.errors).length;

  return NextResponse.json({
    ok: true,
    clinicsScanned: activeClinics.length,
    totalEnrolled,
    totalErrors,
    results,
  });
}
