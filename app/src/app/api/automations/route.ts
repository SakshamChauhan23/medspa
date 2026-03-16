import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  workflowEnrollments,
  workflowResults,
  messages,
  patients,
} from "@/lib/db/schema";
import { eq, and, count, sql } from "drizzle-orm";
import { requireAuth, isNextResponse } from "@/lib/utils/auth";
import { WORKFLOW_REGISTRY } from "@/lib/automation/workflows";

// GET /api/automations — workflow status overview + per-workflow metrics
export async function GET(_req: NextRequest) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  const [enrollmentCounts, resultCounts, messageCounts] = await Promise.all([
    // Active + waiting enrollments per workflow type
    db
      .select({
        workflowType: workflowEnrollments.workflowType,
        status: workflowEnrollments.status,
        count: count(),
      })
      .from(workflowEnrollments)
      .where(eq(workflowEnrollments.clinicId, auth.clinicId))
      .groupBy(workflowEnrollments.workflowType, workflowEnrollments.status),

    // Results per workflow type
    db
      .select({
        workflowType: workflowResults.workflowType,
        result: workflowResults.result,
        count: count(),
      })
      .from(workflowResults)
      .where(eq(workflowResults.clinicId, auth.clinicId))
      .groupBy(workflowResults.workflowType, workflowResults.result),

    // Messages sent per workflow
    db
      .select({ count: count() })
      .from(messages)
      .where(
        and(
          eq(messages.clinicId, auth.clinicId),
          eq(messages.direction, "outbound")
        )
      ),
  ]);

  // Build per-workflow summary
  const workflows = Object.values(WORKFLOW_REGISTRY).map((def) => {
    const enrollments = enrollmentCounts.filter((e) => e.workflowType === def.type);
    const results = resultCounts.filter((r) => r.workflowType === def.type);

    const activeCount = enrollments
      .filter((e) => e.status === "active" || e.status === "waiting")
      .reduce((sum, e) => sum + Number(e.count), 0);

    const completedCount = enrollments
      .filter((e) => e.status === "completed")
      .reduce((sum, e) => sum + Number(e.count), 0);

    const bookedCount = results
      .filter((r) => r.result === "booked")
      .reduce((sum, r) => sum + Number(r.count), 0);

    const totalEnrolled = enrollments.reduce((sum, e) => sum + Number(e.count), 0);
    const conversionRate = totalEnrolled > 0
      ? Math.round((bookedCount / totalEnrolled) * 100)
      : 0;

    return {
      type: def.type,
      name: def.name,
      description: def.description,
      requiresStandard: def.requiresStandard,
      stats: {
        active: activeCount,
        completed: completedCount,
        booked: bookedCount,
        conversionRate,
        totalEnrolled,
      },
    };
  });

  return NextResponse.json({
    workflows,
    totalMessagesSent: Number(messageCounts[0]?.count ?? 0),
  });
}
