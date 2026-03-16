import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clinicSubscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { billingProvider } from "@/lib/billing/stripe";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  const payload = await req.text();

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = billingProvider.verifyWebhook(payload, signature) as typeof event;
  } catch {
    return new Response("Invalid webhook signature", { status: 400 });
  }

  const obj = event.data.object;

  switch (event.type) {
    case "checkout.session.completed": {
      const clinicId = obj.metadata as Record<string, string> | null;
      const cId = clinicId?.clinicId;
      if (!cId) break;

      await db
        .insert(clinicSubscriptions)
        .values({
          clinicId: cId,
          stripeCustomerId: obj.customer as string | null ?? undefined,
          stripeSubscriptionId: obj.subscription as string | null ?? undefined,
          planTier: (obj.metadata as Record<string, string>)?.plan === "standard" ? "standard" : "starter",
          status: "active",
          setupFeeWaived: (obj.metadata as Record<string, string>)?.waiveSetupFee === "true",
        })
        .onConflictDoUpdate({
          target: clinicSubscriptions.clinicId,
          set: {
            stripeCustomerId: obj.customer as string | null ?? undefined,
            stripeSubscriptionId: obj.subscription as string | null ?? undefined,
            status: "active",
            updatedAt: new Date(),
          },
        });
      break;
    }

    case "invoice.paid": {
      const subId = obj.subscription as string | null;
      if (!subId) break;

      const periodEnd = obj.lines as { data: Array<{ period: { end: number } }> } | null;
      const endTimestamp = periodEnd?.data?.[0]?.period?.end;

      await db
        .update(clinicSubscriptions)
        .set({
          status: "active",
          currentPeriodEnd: endTimestamp ? new Date(endTimestamp * 1000) : undefined,
          updatedAt: new Date(),
        })
        .where(eq(clinicSubscriptions.stripeSubscriptionId, subId));
      break;
    }

    case "customer.subscription.deleted": {
      const subId = obj.id as string;
      await db
        .update(clinicSubscriptions)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(clinicSubscriptions.stripeSubscriptionId, subId));
      break;
    }

    case "customer.subscription.updated": {
      const subId = obj.id as string;
      const status = obj.status as string;
      const cancelAtPeriodEnd = obj.cancel_at_period_end as boolean;
      const currentPeriodEnd = obj.current_period_end as number | null;

      await db
        .update(clinicSubscriptions)
        .set({
          status: (["active", "past_due", "cancelled", "trialing"].includes(status)
            ? status
            : "active") as "active" | "past_due" | "cancelled" | "trialing",
          cancelAtPeriodEnd: cancelAtPeriodEnd ?? false,
          currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : undefined,
          updatedAt: new Date(),
        })
        .where(eq(clinicSubscriptions.stripeSubscriptionId, subId));
      break;
    }

    default:
      // Unhandled event type — ignore
      break;
  }

  return NextResponse.json({ received: true });
}
