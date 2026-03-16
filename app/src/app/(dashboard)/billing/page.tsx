import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { clinicSubscriptions, users } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PLANS, SETUP_FEE, FOUNDING_CLINIC_LIMIT } from "@/lib/billing/stripe";
import { CheckoutButton } from "@/components/billing/CheckoutButton";
import { CheckCircle2, Zap } from "lucide-react";

async function getClinicId(userId: string) {
  const [user] = await db.select({ clinicId: users.clinicId }).from(users).where(eq(users.clerkUserId, userId)).limit(1);
  return user?.clinicId ?? null;
}

export default async function BillingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const clinicId = await getClinicId(userId);
  if (!clinicId) redirect("/dashboard");

  const [subscription] = await db.select().from(clinicSubscriptions).where(eq(clinicSubscriptions.clinicId, clinicId)).limit(1);
  const [{ value: totalClinics }] = await db.select({ value: count() }).from(clinicSubscriptions);

  const isFoundingClinic = Number(totalClinics) < FOUNDING_CLINIC_LIMIT;
  const foundingSpotsLeft = Math.max(0, FOUNDING_CLINIC_LIMIT - Number(totalClinics));
  const currentPlan = subscription?.planTier ?? null;
  const isActive = subscription?.status === "active" || subscription?.status === "trialing";
  const renewsDate = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: "#1E293B" }}>Billing</h1>
        <p className="mt-1 text-sm" style={{ color: "#64748B" }}>Manage your subscription plan.</p>
      </div>

      {isFoundingClinic && !isActive && (
        <div className="mb-6 p-4 rounded-xl flex items-center gap-3" style={{ background: "#FFF3EE", border: "1px solid #FFD5C2" }}>
          <Zap size={18} style={{ color: "#FF6B35" }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "#FF6B35" }}>
              Founding Clinic Pricing — {foundingSpotsLeft} spot{foundingSpotsLeft !== 1 ? "s" : ""} remaining
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#7C3D1A" }}>
              Setup fee (${SETUP_FEE}) is waived for the first {FOUNDING_CLINIC_LIMIT} clinics. Price locked for life.
            </p>
          </div>
        </div>
      )}

      {isActive && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <Badge variant="success">Active</Badge>
          </CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{ background: "#FF6B35" }}>
              {currentPlan === "standard" ? "S+" : "S"}
            </div>
            <div>
              <p className="font-semibold" style={{ color: "#1E293B" }}>
                {PLANS[currentPlan as keyof typeof PLANS]?.name ?? "Plan"} — ${PLANS[currentPlan as keyof typeof PLANS]?.priceMonthly}/month
              </p>
              {renewsDate && (
                <p className="text-xs" style={{ color: "#64748B" }}>Renews {renewsDate}</p>
              )}
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl">
        {(["starter", "standard"] as const).map((planKey) => {
          const plan = PLANS[planKey];
          const isCurrent = currentPlan === planKey && isActive;
          const isUpgrade = currentPlan === "starter" && planKey === "standard";

          return (
            <Card key={planKey} className={isCurrent ? "ring-2 ring-orange-400" : ""}>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-lg" style={{ color: "#1E293B" }}>{plan.name}</h3>
                  {isCurrent && <Badge variant="success">Current</Badge>}
                  {planKey === "standard" && !isCurrent && <Badge variant="default">Most Popular</Badge>}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold" style={{ color: "#FF6B35" }}>${plan.priceMonthly}</span>
                  <span className="text-sm" style={{ color: "#64748B" }}>/month</span>
                </div>
                {isFoundingClinic && (
                  <p className="text-xs mt-1 font-medium" style={{ color: "#14B8A6" }}>
                    + ${SETUP_FEE} setup fee waived
                  </p>
                )}
              </div>

              <ul className="space-y-2 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm" style={{ color: "#475569" }}>
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0" style={{ color: "#14B8A6" }} />
                    {feature}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="w-full py-2 text-center text-sm rounded-lg" style={{ background: "#F1F5F9", color: "#94A3B8" }}>
                  Current plan
                </div>
              ) : (
                <CheckoutButton plan={planKey} isUpgrade={isUpgrade} />
              )}
            </Card>
          );
        })}
      </div>

      <p className="mt-6 text-xs" style={{ color: "#94A3B8" }}>
        Cancel anytime. One rebooked Botox appointment covers your monthly subscription.
      </p>
    </div>
  );
}
