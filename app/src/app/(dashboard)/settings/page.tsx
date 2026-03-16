import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { clinics, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ClinicProfileForm } from "@/components/settings/ClinicProfileForm";
import Link from "next/link";

async function getClinicData(userId: string) {
  const [user] = await db
    .select({ clinicId: users.clinicId, role: users.role, fullName: users.fullName, email: users.email })
    .from(users)
    .where(eq(users.clerkUserId, userId))
    .limit(1);
  if (!user?.clinicId) return null;

  const [clinic] = await db.select().from(clinics).where(eq(clinics.id, user.clinicId)).limit(1);
  return { user, clinic };
}

export default async function SettingsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const data = await getClinicData(userId);
  if (!data) redirect("/dashboard");

  const { user, clinic } = data;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: "#1E293B" }}>Settings</h1>
        <p className="mt-1 text-sm" style={{ color: "#64748B" }}>Manage your clinic account and preferences.</p>
      </div>

      <div className="max-w-2xl space-y-5">
        {/* Clinic Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Clinic Profile</CardTitle>
          </CardHeader>
          <ClinicProfileForm
            clinicId={clinic.id}
            name={clinic.name}
            email={clinic.email}
            phone={clinic.phone ?? null}
            timezone={clinic.timezone ?? null}
          />
        </Card>

        {/* Messaging */}
        <Card>
          <CardHeader>
            <CardTitle>Messaging Providers</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            {[
              { name: "Twilio SMS",     env: "TWILIO_ACCOUNT_SID",  configured: !!process.env.TWILIO_ACCOUNT_SID },
              { name: "SendGrid Email", env: "SENDGRID_API_KEY",    configured: !!process.env.SENDGRID_API_KEY   },
            ].map((item) => (
              <div key={item.name} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "#F8FAFC" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs"
                  style={{ background: item.configured ? "#F0FDFA" : "#FFF3EE", color: item.configured ? "#14B8A6" : "#FF6B35" }}>
                  {item.name[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: "#1E293B" }}>{item.name}</p>
                  <p className="text-xs" style={{ color: "#94A3B8" }}>
                    Set <code className="font-mono">{item.env}</code> in .env.local
                  </p>
                </div>
                <Badge variant={item.configured ? "success" : "warning"}>
                  {item.configured ? "Active" : "Stub"}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Account */}
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "#F8FAFC" }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0" style={{ background: "#FF6B35" }}>
                {(user.fullName?.[0] ?? user.email[0]).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "#1E293B" }}>{user.fullName ?? "—"}</p>
                <p className="text-xs truncate" style={{ color: "#94A3B8" }}>{user.email}</p>
              </div>
              <Badge variant="default">{user.role}</Badge>
            </div>
          </div>
        </Card>

        {/* Billing shortcut */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
          </CardHeader>
          <p className="text-sm mb-3" style={{ color: "#64748B" }}>Manage your plan and payment details.</p>
          <Link
            href="/billing"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: "#FF6B35" }}
          >
            View billing →
          </Link>
        </Card>
      </div>
    </div>
  );
}
