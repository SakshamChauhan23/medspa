# Stub Interfaces & Pending Integrations

This document lists every external service or feature that currently has a **stub interface** written
but no real implementation wired up. Each entry includes the interface location, what the stub does,
and exactly what you need to do to activate the real implementation.

---

## 1. Authentication — Clerk

| | |
|---|---|
| **Status** | Stub active — shows setup instructions page |
| **Interface file** | `app/src/lib/auth/index.ts` |
| **Stub behaviour** | `auth()` returns `{ userId: null }`. All dashboard routes redirect to `/sign-in`, which shows a setup page instead of the Clerk widget. |
| **Real component files** | `app/src/app/(auth)/sign-in/`, `app/src/app/(auth)/sign-up/`, `app/src/components/layout/Sidebar.tsx` (UserButton) |

### To activate
1. Create a free app at [clerk.com](https://clerk.com)
2. Copy your **Publishable key** (`pk_test_…`) and **Secret key** (`sk_test_…`)
3. Paste into `app/.env.local`:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_KEY
   CLERK_SECRET_KEY=sk_test_YOUR_KEY
   ```
4. Restart `npm run dev`
5. In `app/src/components/layout/Sidebar.tsx` restore `<UserButton>`:
   ```tsx
   import { UserButton } from "@clerk/nextjs";
   // replace the stub avatar div with:
   <UserButton appearance={{ variables: { colorPrimary: "#FF6B35" } }} />
   ```

---

## 2. SMS — Twilio

| | |
|---|---|
| **Status** | Stub active — logs to console, returns fake message IDs |
| **Interface file** | `app/src/lib/messaging/sms.ts` |
| **Interface** | `ISmsProvider` → `send(to, body): Promise<{ sid }>` · `verifyWebhook(payload, signature, url): boolean` |
| **Stub class** | `StubSmsProvider` — prints `[SMS STUB] → {to}: {body}` to the terminal |

### To activate
1. Create a [Twilio](https://twilio.com) account and buy a phone number
2. Complete **10DLC brand + campaign registration** (US A2P — takes 2–4 weeks; start immediately)
3. Add to `app/.env.local`:
   ```
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
   ```
4. In `app/src/lib/messaging/sms.ts`, uncomment `TwilioSmsProvider` and change the export:
   ```ts
   export const smsProvider: ISmsProvider = new TwilioSmsProvider();
   ```
5. Point the Twilio webhook to `https://yourdomain.com/api/webhooks/twilio`

---

## 3. Email — SendGrid

| | |
|---|---|
| **Status** | Stub active — logs to console |
| **Interface file** | `app/src/lib/messaging/email.ts` |
| **Interface** | `IEmailProvider` → `send({ to, subject, html, text }): Promise<void>` |
| **Stub class** | `StubEmailProvider` — prints `[EMAIL STUB] → {to}: {subject}` to the terminal |

### To activate
1. Create a [SendGrid](https://sendgrid.com) account and verify a sender domain
2. Add to `app/.env.local`:
   ```
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   SENDGRID_FROM_EMAIL=hello@yourclinic.com
   ```
3. In `app/src/lib/messaging/email.ts`, uncomment `SendGridEmailProvider` and change the export:
   ```ts
   export const emailProvider: IEmailProvider = new SendGridEmailProvider();
   ```

---

## 4. Payments — Stripe

| | |
|---|---|
| **Status** | Stub active — checkout immediately redirects to `successUrl` |
| **Interface file** | `app/src/lib/billing/stripe.ts` |
| **Interface** | `IBillingProvider` → `createCheckoutSession` · `createPortalSession` · `getSubscriptionStatus` · `verifyWebhook` |
| **Stub class** | `StubBillingProvider` — no charge is made; redirects straight to the success URL |
| **Plan config** | `PLANS.starter = $99/mo`, `PLANS.standard = $149/mo`, `SETUP_FEE = $299`, `FOUNDING_CLINIC_LIMIT = 10` |

### To activate
1. Create a [Stripe](https://stripe.com) account (test mode first)
2. Create two Products in the Stripe dashboard matching the plan prices
3. Add to `app/.env.local`:
   ```
   STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   STRIPE_STARTER_PRICE_ID=price_xxxxxxxxxxxxxxxxxxxxxxxx
   STRIPE_STANDARD_PRICE_ID=price_xxxxxxxxxxxxxxxxxxxxxxxx
   ```
4. In `app/src/lib/billing/stripe.ts`, uncomment `StripeBillingProvider` and change the export:
   ```ts
   export const billingProvider: IBillingProvider = new StripeBillingProvider();
   ```
5. Register the webhook at `https://yourdomain.com/api/webhooks/stripe` for events:
   `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

---

## 5. PMS Connector — Aesthetic Record

| | |
|---|---|
| **Status** | Client written; sync worker implemented; **no live credentials** |
| **Interface file** | `app/src/lib/connectors/aesthetic-record/client.ts` |
| **Sync pipeline** | `app/src/lib/connectors/aesthetic-record/sync.ts` |
| **What it does** | Cursor-paginated fetch of patients, treatments, and appointments; upserts to DB; emits events that trigger automation workflows |

### To activate
1. Obtain Aesthetic Record API credentials (contact their support/partner team)
2. Add to `app/.env.local`:
   ```
   AESTHETIC_RECORD_API_KEY=your_api_key
   AESTHETIC_RECORD_BASE_URL=https://api.aestheticrecord.com
   ```
3. In the Integrations dashboard page, the "Connect" flow calls `POST /api/integrations/aesthetic-record`
   which stores the credentials and enqueues the first full sync via BullMQ

---

## 6. Background Jobs — BullMQ / Redis

| | |
|---|---|
| **Status** | Queue and worker code complete; requires a running Redis instance |
| **Queue file** | `app/src/lib/jobs/queues.ts` |
| **Worker file** | `app/src/lib/jobs/worker.ts` |
| **Queues** | `pms-sync`, `workflow-step`, `daily-trigger-scan` |

### To activate
1. Run Redis locally: `redis-server` (or use [Railway](https://railway.app) / [Upstash](https://upstash.com))
2. Set in `app/.env.local`:
   ```
   REDIS_URL=redis://localhost:6379
   ```
3. Run the worker process separately from the Next.js app:
   ```bash
   npx tsx src/lib/jobs/worker.ts
   # or add "worker": "tsx src/lib/jobs/worker.ts" to package.json scripts
   ```
4. For production, deploy the worker as a separate Railway / Render service pointing at the same Redis

---

## 7. Database — PostgreSQL / Drizzle

| | |
|---|---|
| **Status** | Schema complete; requires a running Postgres instance |
| **Schema file** | `app/src/lib/db/schema.ts` |
| **Client file** | `app/src/lib/db/index.ts` |

### To activate
1. Run Postgres locally or spin up a free [Railway](https://railway.app) Postgres
2. Set in `app/.env.local`:
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/medspa
   ```
3. Run migrations:
   ```bash
   npx drizzle-kit generate
   npx drizzle-kit migrate
   ```

---

## Summary Table

| Service | Interface | Stub | Needs to go live |
|---|---|---|---|
| Auth (Clerk) | `lib/auth/index.ts` | Returns `userId: null` | Clerk API keys |
| SMS (Twilio) | `lib/messaging/sms.ts` | Console log | Twilio keys + 10DLC |
| Email (SendGrid) | `lib/messaging/email.ts` | Console log | SendGrid keys |
| Payments (Stripe) | `lib/billing/stripe.ts` | Instant redirect | Stripe keys + webhook |
| PMS (Aesthetic Record) | `lib/connectors/aesthetic-record/` | Not connected | AR API credentials |
| Job Queue (BullMQ) | `lib/jobs/queues.ts` | Lazy init / no-op | Redis server |
| Database (Postgres) | `lib/db/index.ts` | Lazy init / throws | Postgres instance |
