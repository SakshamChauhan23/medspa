import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { workflowEnrollments, workflowResults, messages, users } from "@/lib/db/schema";
import { eq, and, count } from "drizzle-orm";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { WORKFLOW_REGISTRY } from "@/lib/automation/workflows";
import { TriggerScanButton } from "@/components/automations/TriggerScanButton";
import { Zap, TrendingUp, MessageSquare, CheckCircle2 } from "lucide-react";

async function getClinicId(userId: string) {
  const [user] = await db.select({ clinicId: users.clinicId }).from(users).where(eq(users.clerkUserId, userId)).limit(1);
  return user?.clinicId ?? null;
}

async function getAutomationStats(clinicId: string) {
  const [enrollmentRows, resultRows, [messageCount]] = await Promise.all([
    db.select({ workflowType: workflowEnrollments.workflowType, status: workflowEnrollments.status, count: count() })
      .from(workflowEnrollments).where(eq(workflowEnrollments.clinicId, clinicId))
      .groupBy(workflowEnrollments.workflowType, workflowEnrollments.status),
    db.select({ workflowType: workflowResults.workflowType, result: workflowResults.result, count: count() })
      .from(workflowResults).where(eq(workflowResults.clinicId, clinicId))
      .groupBy(workflowResults.workflowType, workflowResults.result),
    db.select({ count: count() }).from(messages).where(and(eq(messages.clinicId, clinicId), eq(messages.direction, "outbound"))),
  ]);
  return { enrollmentRows, resultRows, totalMessagesSent: Number(messageCount?.count ?? 0) };
}

export default async function AutomationsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const clinicId = await getClinicId(userId);
  if (!clinicId) redirect("/dashboard");

  const { enrollmentRows, resultRows, totalMessagesSent } = await getAutomationStats(clinicId);

  const workflowSummaries = Object.values(WORKFLOW_REGISTRY).map((def) => {
    const enrollments = enrollmentRows.filter((e) => e.workflowType === def.type);
    const results = resultRows.filter((r) => r.workflowType === def.type);
    const active = enrollments.filter((e) => e.status === "active" || e.status === "waiting").reduce((s, e) => s + Number(e.count), 0);
    const completed = enrollments.filter((e) => e.status === "completed").reduce((s, e) => s + Number(e.count), 0);
    const booked = results.filter((r) => r.result === "booked").reduce((s, r) => s + Number(r.count), 0);
    const total = enrollments.reduce((s, e) => s + Number(e.count), 0);
    return { ...def, stats: { active, completed, booked, total, conversionRate: total > 0 ? Math.round((booked / total) * 100) : 0 } };
  });

  const totalActive = workflowSummaries.reduce((s, w) => s + w.stats.active, 0);
  const totalBooked = workflowSummaries.reduce((s, w) => s + w.stats.booked, 0);
  const totalEnrolled = workflowSummaries.reduce((s, w) => s + w.stats.total, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#1E293B" }}>Automations</h1>
          <p className="mt-1 text-sm" style={{ color: "#64748B" }}>Manage and monitor your revenue workflows.</p>
        </div>
        <TriggerScanButton />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Active Workflows", value: totalActive,        icon: Zap,          color: "#FF6B35", bg: "#FFF3EE" },
          { label: "Total Enrolled",   value: totalEnrolled,      icon: MessageSquare, color: "#1E293B", bg: "#F1F5F9" },
          { label: "Reactivations",    value: totalBooked,        icon: TrendingUp,   color: "#14B8A6", bg: "#F0FDFA" },
          { label: "Messages Sent",    value: totalMessagesSent,  icon: CheckCircle2, color: "#14B8A6", bg: "#F0FDFA" },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} padding="md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs mb-1" style={{ color: "#64748B" }}>{card.label}</p>
                  <p className="text-2xl font-bold" style={{ color: "#1E293B" }}>{card.value}</p>
                </div>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: card.bg }}>
                  <Icon size={16} style={{ color: card.color }} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="space-y-4">
        {workflowSummaries.map((wf) => (
          <Card key={wf.type}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-base" style={{ color: "#1E293B" }}>{wf.name}</h3>
                  <Badge variant={wf.requiresStandard ? "accent" : "default"}>
                    {wf.requiresStandard ? "Standard" : "Starter"}
                  </Badge>
                </div>
                <p className="text-sm" style={{ color: "#64748B" }}>{wf.description}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: wf.stats.active > 0 ? "#14B8A6" : "#E2E8F0" }} />
                <span className="text-xs" style={{ color: wf.stats.active > 0 ? "#14B8A6" : "#94A3B8" }}>
                  {wf.stats.active > 0 ? "Running" : "Idle"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Active",     value: wf.stats.active,         color: "#FF6B35" },
                { label: "Completed",  value: wf.stats.completed,      color: "#14B8A6" },
                { label: "Rebooked",   value: wf.stats.booked,         color: "#14B8A6" },
                { label: "Conversion", value: `${wf.stats.conversionRate}%`, color: "#1E293B" },
              ].map((stat) => (
                <div key={stat.label} className="p-3 rounded-lg" style={{ background: "#F8FAFC" }}>
                  <p className="text-xs mb-0.5" style={{ color: "#94A3B8" }}>{stat.label}</p>
                  <p className="text-lg font-bold" style={{ color: stat.color }}>{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
              {wf.steps.map((step, i) => (
                <div key={step.stepNumber} className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs" style={{ background: "#F0FDFA", color: "#0D9488" }}>
                    {step.action === "send_sms" ? "📱" : "✉️"} Step {step.stepNumber}
                    {step.delayHours > 0 && (
                      <span style={{ color: "#94A3B8" }}>+{step.delayHours >= 24 ? `${step.delayHours / 24}d` : `${step.delayHours}h`}</span>
                    )}
                  </div>
                  {i < wf.steps.length - 1 && <span style={{ color: "#CBD5E1" }}>→</span>}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
