/**
 * SMS Provider Interface — Twilio placeholder
 *
 * Swap `StubSmsProvider` for `TwilioSmsProvider` in Phase 2
 * once Twilio credentials + 10DLC registration are complete.
 *
 * Nothing in this file calls Twilio — all sends are logged to console
 * and stored in the DB as if they were real.
 */

export interface SendSmsOptions {
  to: string;          // E.164 phone number e.g. +12125551234
  body: string;        // SMS body (max 160 chars per segment)
  clinicId: string;    // For per-clinic number routing
  patientId?: string;  // For logging / opt-out enforcement
}

export interface SmsResult {
  success: boolean;
  providerMessageId: string | null;
  error?: string;
}

export interface InboundSms {
  from: string;        // Patient phone number
  to: string;          // Clinic Twilio number
  body: string;
  providerMessageId: string;
  receivedAt: Date;
}

export interface ISmsProvider {
  send(opts: SendSmsOptions): Promise<SmsResult>;
  /** Verify a webhook signature from the provider */
  verifyWebhook(payload: string, signature: string, url: string): boolean;
}

// ─── Stub Implementation ──────────────────────────────────────────────────────

export class StubSmsProvider implements ISmsProvider {
  async send(opts: SendSmsOptions): Promise<SmsResult> {
    const fakeId = `stub_sms_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    console.log(
      `[SMS STUB] → ${opts.to}\n` +
      `  clinicId: ${opts.clinicId}\n` +
      `  body: ${opts.body}\n` +
      `  fakeId: ${fakeId}`
    );

    // Simulate a small delivery delay
    await new Promise((r) => setTimeout(r, 50));

    return { success: true, providerMessageId: fakeId };
  }

  verifyWebhook(_payload: string, _signature: string, _url: string): boolean {
    // Stub always validates — real Twilio uses HMAC-SHA1
    return true;
  }
}

// ─── Real Twilio Implementation (wired up in Phase 2) ─────────────────────────
// Uncomment and install `twilio` package when ready:
//
// import twilio from "twilio";
//
// export class TwilioSmsProvider implements ISmsProvider {
//   private client: twilio.Twilio;
//   private fromNumber: string;
//
//   constructor() {
//     this.client = twilio(
//       process.env.TWILIO_ACCOUNT_SID!,
//       process.env.TWILIO_AUTH_TOKEN!
//     );
//     this.fromNumber = process.env.TWILIO_PHONE_NUMBER!;
//   }
//
//   async send(opts: SendSmsOptions): Promise<SmsResult> {
//     try {
//       const msg = await this.client.messages.create({
//         to: opts.to,
//         from: this.fromNumber,
//         body: opts.body,
//       });
//       return { success: true, providerMessageId: msg.sid };
//     } catch (err: any) {
//       return { success: false, providerMessageId: null, error: err.message };
//     }
//   }
//
//   verifyWebhook(payload: string, signature: string, url: string): boolean {
//     return twilio.validateRequest(
//       process.env.TWILIO_AUTH_TOKEN!,
//       signature,
//       url,
//       Object.fromEntries(new URLSearchParams(payload))
//     );
//   }
// }

// ─── Active provider — swap this to TwilioSmsProvider when ready ──────────────
export const smsProvider: ISmsProvider = new StubSmsProvider();
