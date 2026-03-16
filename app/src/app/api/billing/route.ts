import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clinicSubscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, isNextResponse } from "@/lib/utils/auth";
import { billingProvider, PLANS, SETUP_FEE, type PlanTier } from "@/lib/billing/stripe";
import { z } from "zod";

// GET /api/billing — subscription status
export async function GET(_req: NextRequest) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  const [subscription] = await db
    .select()
    .from(clinicSubscriptions)
    .where(eq(clinicSubscriptions.clinicId, auth.clinicId))
    .limit(1);

  const status = await billingProvider.getSubscriptionStatus(auth.clinicId);

  return NextResponse.json({
    subscription: subscription ?? null,
    status,
    plans: PLANS,
    setupFee: SETUP_FEE,
  });
}

const subscribeSchema = z.object({
  plan: z.enum(["starter", "standard"]),
});

// POST /api/billing — start checkout
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  if (auth.role === "staff") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  // Check founding clinic count for setup fee waiver
  const [{ count }] = await db
    .select({ count: db.$count(clinicSubscriptions) })
    .from(clinicSubscriptions);

  const waiveSetupFee = Number(count) < 10;

  const session = await billingProvider.createCheckoutSession({
    clinicId: auth.clinicId,
    plan: parsed.data.plan as PlanTier,
    successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=true`,
    cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
    waiveSetupFee,
  });

  return NextResponse.json({ checkoutUrl: session.url, sessionId: session.sessionId });
}
