import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, pmsIntegrations, users } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ConnectARForm } from "@/components/integrations/ConnectARForm";
import { SyncButton } from "@/components/integrations/SyncButton";
import { CheckCircle2, AlertCircle, Clock, Database, Users, Calendar } from "lucide-react";

function SyncStatusBadge({ status }: { status: string | null }) {
  switch (status) {
    case "active":  return <Badge variant="success">Connected</Badge>;
    case "error":   return <Badge variant="danger">Error</Badge>;
    case "pending": return <Badge variant="warning">Syncing…</Badge>;
    default:        return <Badge variant="muted">Not connected</Badge>;
  }
}

function SyncStatusIcon({ status }: { status: string | null }) {
  switch (status) {
    case "active":  return <CheckCircle2 size={16} style={{ color: "#14B8A6" }} />;
    case "error":   return <AlertCircle size={16} style={{ color: "#EF4444" }} />;
    case "pending": return <Clock size={16} style={{ color: "#F59E0B" }} />;
    default:        return <Database size={16} style={{ color: "#94A3B8" }} />;
  }
}

export default async function IntegrationsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [user] = await db.select({ clinicId: users.clinicId }).from(users).where(eq(users.clerkUserId, userId)).limit(1);
  const clinicId = user?.clinicId;
  if (!clinicId) redirect("/dashboard");

  const [integration] = await db.select().from(pmsIntegrations)
    .where(and(eq(pmsIntegrations.clinicId, clinicId), eq(pmsIntegrations.pmsType, "aesthetic_record")))
    .limit(1);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: "#1E293B" }}>Integrations</h1>
        <p className="mt-1 text-sm" style={{ color: "#64748B" }}>Connect your practice management system to sync patient data.</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Aesthetic Record */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs" style={{ background: "#1E293B" }}>
                AR
              </div>
              <div>
                <CardTitle>Aesthetic Record</CardTitle>
                <p className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>Most common med spa PMS</p>
              </div>
            </div>
            <SyncStatusBadge status={integration?.syncStatus ?? null} />
          </CardHeader>

          {integration ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "#F8FAFC" }}>
                <SyncStatusIcon status={integration.syncStatus} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: "#1E293B" }}>
                    {integration.syncStatus === "active"
                      ? "Sync active · data is up to date"
                      : integration.syncStatus === "error"
                      ? "Sync failed"
                      : "Sync in progress…"}
                  </p>
                  {integration.lastSyncedAt && (
                    <p className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>
                      Last synced {new Date(integration.lastSyncedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: Users,    label: "Patients",     color: "#FF6B35", bg: "#FFF3EE" },
                  { icon: Database, label: "Treatments",   color: "#8B5CF6", bg: "#F5F3FF" },
                  { icon: Calendar, label: "Appointments", color: "#14B8A6", bg: "#F0FDFA" },
                ].map(({ icon: Icon, label, color, bg }) => (
                  <div key={label} className="p-3 rounded-xl text-center" style={{ background: bg }}>
                    <Icon size={16} className="mx-auto mb-1" style={{ color }} />
                    <p className="text-xs" style={{ color: "#94A3B8" }}>{label}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <SyncButton integrationId={integration.id} fullSync={false} />
                <SyncButton integrationId={integration.id} fullSync={true} />
              </div>

              <div className="text-xs p-3 rounded-lg" style={{ background: "#F0FDFA", color: "#0D9488" }}>
                Patient data syncs automatically every 6 hours. Cancellations and appointment updates sync in real-time via webhook.
              </div>
            </div>
          ) : (
            <ConnectARForm />
          )}
        </Card>

        {/* Messaging providers */}
        <Card>
          <CardHeader>
            <CardTitle>Messaging Providers</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            {[
              { name: "Twilio SMS",    desc: "Required for SMS workflows",   env: "TWILIO_ACCOUNT_SID" },
              { name: "SendGrid Email", desc: "Required for email workflows", env: "SENDGRID_API_KEY"    },
            ].map((item) => (
              <div key={item.name} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "#F8FAFC" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs" style={{ background: "#FFF3EE", color: "#FF6B35" }}>
                  {item.name[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: "#1E293B" }}>{item.name}</p>
                  <p className="text-xs" style={{ color: "#94A3B8" }}>Set <code className="font-mono">{item.env}</code> in .env.local</p>
                </div>
                <Badge variant="warning">Stub</Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Coming soon */}
        <Card>
          <CardHeader>
            <CardTitle>More PMS Integrations</CardTitle>
            <Badge variant="muted">Coming soon</Badge>
          </CardHeader>
          <div className="space-y-3">
            {[
              { name: "Jane App",   desc: "Full booking + patient data sync" },
              { name: "Mindbody",   desc: "Appointments, memberships, packages" },
              { name: "Boulevard",  desc: "High-end clinic booking platform" },
              { name: "Vagaro",     desc: "Mid-market scheduling integration" },
            ].map((pms) => (
              <div key={pms.name} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "#F8FAFC", opacity: 0.6 }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white" style={{ background: "#94A3B8" }}>
                  {pms.name[0]}
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "#1E293B" }}>{pms.name}</p>
                  <p className="text-xs" style={{ color: "#94A3B8" }}>{pms.desc}</p>
                </div>
                <Badge variant="muted" className="ml-auto">Soon</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
