import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { patients, appointments, pmsIntegrations, workflowEnrollments, workflowResults, messages, users } from "@/lib/db/schema";
import { eq, and, count, sql } from "drizzle-orm";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Users, CalendarCheck, Plug, TrendingUp, MessageSquare, Zap } from "lucide-react";
import Link from "next/link";

async function getClinicId(userId: string) {
  const [user] = await db.select({ clinicId: users.clinicId }).from(users).where(eq(users.clerkUserId, userId)).limit(1);
  return user?.clinicId ?? null;
}

async function getDashboardStats(clinicId: string) {
  const [[patientResult], [apptResult], [integration], [activeWorkflows], [bookedResults], [unreadMessages]] = await Promise.all([
    db.select({ value: count() }).from(patients).where(eq(patients.clinicId, clinicId)),
    db.select({ value: count() }).from(appointments).where(and(eq(appointments.clinicId, clinicId), eq(appointments.status, "scheduled"))),
    db.select().from(pmsIntegrations).where(eq(pmsIntegrations.clinicId, clinicId)).limit(1),
    db.select({ value: count() }).from(workflowEnrollments).where(and(eq(workflowEnrollments.clinicId, clinicId), sql`${workflowEnrollments.status} IN ('active','waiting')`)),
    db.select({ value: count() }).from(workflowResults).where(and(eq(workflowResults.clinicId, clinicId), eq(workflowResults.result, "booked"))),
    db.select({ value: count() }).from(messages).where(and(eq(messages.clinicId, clinicId), eq(messages.direction, "inbound"), eq(messages.requiresStaffReply, true))),
  ]);
  return {
    patients: Number(patientResult?.value ?? 0),
    upcomingAppointments: Number(apptResult?.value ?? 0),
    integration: integration ?? null,
    activeWorkflows: Number(activeWorkflows?.value ?? 0),
    reactivations: Number(bookedResults?.value ?? 0),
    unreadMessages: Number(unreadMessages?.value ?? 0),
  };
}

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const clinicId = await getClinicId(userId);

  if (!clinicId) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: "#1E293B" }}>Welcome to MedSpa Revenue</h1>
          <p className="mt-1 text-sm" style={{ color: "#64748B" }}>Get started by connecting your practice management system.</p>
        </div>
        <div className="rounded-xl border-2 border-dashed p-12 text-center" style={{ borderColor: "#E2E8F0" }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "#FFF3EE" }}>
            <Plug size={24} style={{ color: "#FF6B35" }} />
          </div>
          <h3 className="font-semibold text-base mb-1" style={{ color: "#1E293B" }}>Connect your PMS</h3>
          <p className="text-sm mb-6" style={{ color: "#64748B" }}>Connect Aesthetic Record to start syncing your patient data.</p>
          <Link href="/integrations" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: "#FF6B35" }}>
            <Plug size={14} /> Connect PMS
          </Link>
        </div>
      </div>
    );
  }

  const stats = await getDashboardStats(clinicId);

  const statCards = [
    { label: "Total Patients",         value: stats.patients.toLocaleString(),             icon: Users,          color: "#FF6B35", bg: "#FFF3EE", href: "/patients"     },
    { label: "Upcoming Appointments",  value: stats.upcomingAppointments.toLocaleString(), icon: CalendarCheck,  color: "#14B8A6", bg: "#F0FDFA", href: "/patients"     },
    { label: "Active Workflows",       value: stats.activeWorkflows.toLocaleString(),       icon: Zap,            color: "#FF6B35", bg: "#FFF3EE", href: "/automations"  },
    { label: "Reactivations",          value: stats.reactivations.toLocaleString(),         icon: TrendingUp,     color: "#14B8A6", bg: "#F0FDFA", href: "/automations"  },
    {
      label: "Unread Messages", value: stats.unreadMessages.toLocaleString(), icon: MessageSquare,
      color: stats.unreadMessages > 0 ? "#FF6B35" : "#14B8A6",
      bg:    stats.unreadMessages > 0 ? "#FFF3EE" : "#F0FDFA",
      href: "/inbox",
    },
    {
      label: "PMS Status", value: stats.integration?.syncStatus === "active" ? "Connected" : "Not connected",
      icon: Plug,
      color: stats.integration?.syncStatus === "active" ? "#14B8A6" : "#94A3B8",
      bg:    stats.integration?.syncStatus === "active" ? "#F0FDFA"  : "#F8FAFC",
      href: "/integrations",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: "#1E293B" }}>Overview</h1>
        <p className="mt-1 text-sm" style={{ color: "#64748B" }}>Your clinic's revenue system at a glance.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link href={card.href} key={card.label} className="group">
              <Card className="hover:shadow-md transition-shadow duration-200" padding="md">
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
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Automation Workflows</CardTitle>
          <Link href="/automations" className="text-xs font-medium" style={{ color: "#FF6B35" }}>View all →</Link>
        </CardHeader>
        <div className="space-y-2.5">
          {[
            { name: "Botox Reactivation",    desc: "90+ day overdue patients",     plan: "Starter",   active: stats.activeWorkflows > 0 },
            { name: "Appointment Reminders", desc: "24h SMS + confirmation",       plan: "Starter",   active: stats.activeWorkflows > 0 },
            { name: "Cancellation Recovery", desc: "Waitlist slot refill",         plan: "Standard",  active: false },
            { name: "Membership Retention",  desc: "30-day renewal outreach",      plan: "Standard",  active: false },
          ].map((wf) => (
            <div key={wf.name} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "#F8FAFC" }}>
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: wf.active ? "#14B8A6" : "#CBD5E1" }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: "#1E293B" }}>{wf.name}</p>
                <p className="text-xs" style={{ color: "#94A3B8" }}>{wf.desc}</p>
              </div>
              <Badge variant={wf.plan === "Starter" ? "default" : "accent"}>{wf.plan}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
