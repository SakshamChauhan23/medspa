/**
 * Billing Provider Interface — Stripe placeholder
 *
 * Swap `StubBillingProvider` for `StripeBillingProvider` in Phase 2
 * once Stripe account and webhook endpoint are configured.
 *
 * Plans:
 *   starter  — $99/month  (Module 1: Revenue Rebooking only)
 *   standard — $149/month (Module 1 + 2: Full suite)
 */

export type PlanTier = "starter" | "standard";

export interface CreateCheckoutSessionOptions {
  clinicId: string;
  plan: PlanTier;
  successUrl: string;
  cancelUrl: string;
  /** If true, waive the $299 setup fee (first 10 founding clinics) */
  waiveSetupFee?: boolean;
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
}

export interface CreatePortalSessionOptions {
  clinicId: string;
  returnUrl: string;
}

export interface PortalSession {
  url: string;
}

export interface SubscriptionStatus {
  active: boolean;
  plan: PlanTier | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

export interface IBillingProvider {
  createCheckoutSession(opts: CreateCheckoutSessionOptions): Promise<CheckoutSession>;
  createPortalSession(opts: CreatePortalSessionOptions): Promise<PortalSession>;
  getSubscriptionStatus(clinicId: string): Promise<SubscriptionStatus>;
  /** Verify a webhook signature from the provider */
  verifyWebhook(payload: string | Buffer, signature: string): unknown;
}

// ─── Plan metadata ────────────────────────────────────────────────────────────

export const PLANS: Record<PlanTier, { name: string; priceMonthly: number; features: string[] }> = {
  starter: {
    name: "Starter",
    priceMonthly: 99,
    features: [
      "Revenue Rebooking System",
      "Botox & filler reactivation",
      "Laser package completion follow-up",
      "Membership retention outreach",
      "Smart SMS + email cadence",
      "Monthly performance reporting",
    ],
  },
  standard: {
    name: "Standard",
    priceMonthly: 149,
    features: [
      "Everything in Starter",
      "Treatment Room Protection System",
      "Intelligent appointment reminders",
      "Confirmation automation",
      "Same-day cancellation recovery",
      "No-show reduction logic",
      "Priority support",
    ],
  },
};

export const SETUP_FEE = 299;
export const FOUNDING_CLINIC_LIMIT = 10;

// ─── Stub Implementation ──────────────────────────────────────────────────────

export class StubBillingProvider implements IBillingProvider {
  async createCheckoutSession(opts: CreateCheckoutSessionOptions): Promise<CheckoutSession> {
    const fakeSessionId = `stub_cs_${Date.now()}`;

    console.log(
      `[BILLING STUB] Checkout session created\n` +
      `  clinicId: ${opts.clinicId}\n` +
      `  plan: ${opts.plan} ($${PLANS[opts.plan].priceMonthly}/mo)\n` +
      `  setupFee: ${opts.waiveSetupFee ? "waived" : `$${SETUP_FEE}`}\n` +
      `  successUrl: ${opts.successUrl}`
    );

    return {
      sessionId: fakeSessionId,
      // Redirect to success URL immediately in stub mode
      url: opts.successUrl,
    };
  }

  async createPortalSession(opts: CreatePortalSessionOptions): Promise<PortalSession> {
    console.log(`[BILLING STUB] Portal session created for clinicId: ${opts.clinicId}`);
    return { url: opts.returnUrl };
  }

  async getSubscriptionStatus(_clinicId: string): Promise<SubscriptionStatus> {
    // Stub: every clinic is on standard plan and active
    return {
      active: true,
      plan: "standard",
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
    };
  }

  verifyWebhook(_payload: string | Buffer, _signature: string): unknown {
    // Stub always validates
    return { type: "stub.event", data: {} };
  }
}

// ─── Real Stripe Implementation (wired up in Phase 2) ────────────────────────
// Uncomment and install `stripe` when ready:
//
// import Stripe from "stripe";
//
// export class StripeBillingProvider implements IBillingProvider {
//   private stripe: Stripe;
//
//   constructor() {
//     this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
//       apiVersion: "2024-04-10",
//     });
//   }
//
//   async createCheckoutSession(opts: CreateCheckoutSessionOptions) {
//     const priceId = opts.plan === "starter"
//       ? process.env.STRIPE_STARTER_PRICE_ID!
//       : process.env.STRIPE_STANDARD_PRICE_ID!;
//
//     const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
//       { price: priceId, quantity: 1 },
//     ];
//
//     if (!opts.waiveSetupFee) {
//       lineItems.push({ price: process.env.STRIPE_SETUP_FEE_PRICE_ID!, quantity: 1 });
//     }
//
//     const session = await this.stripe.checkout.sessions.create({
//       mode: "subscription",
//       line_items: lineItems,
//       success_url: opts.successUrl,
//       cancel_url: opts.cancelUrl,
//       metadata: { clinicId: opts.clinicId },
//     });
//
//     return { sessionId: session.id, url: session.url! };
//   }
//
//   async createPortalSession(opts: CreatePortalSessionOptions) {
//     // Look up Stripe customer ID from DB
//     const session = await this.stripe.billingPortal.sessions.create({
//       customer: "cus_xxx", // fetch from DB
//       return_url: opts.returnUrl,
//     });
//     return { url: session.url };
//   }
//
//   async getSubscriptionStatus(clinicId: string): Promise<SubscriptionStatus> {
//     // Fetch from DB or Stripe API
//     return { active: false, plan: null, currentPeriodEnd: null, cancelAtPeriodEnd: false };
//   }
//
//   verifyWebhook(payload: string | Buffer, signature: string) {
//     return this.stripe.webhooks.constructEvent(
//       payload,
//       signature,
//       process.env.STRIPE_WEBHOOK_SECRET!
//     );
//   }
// }

// ─── Active provider — swap to StripeBillingProvider when ready ───────────────
export const billingProvider: IBillingProvider = new StubBillingProvider();
