/**
 * Email Provider Interface — SendGrid placeholder
 *
 * Swap `StubEmailProvider` for `SendGridEmailProvider` in Phase 2
 * once SendGrid credentials and domain authentication are complete.
 */

export interface SendEmailOptions {
  to: string;
  subject: string;
  /** Plain text fallback */
  text: string;
  /** Optional HTML version */
  html?: string;
  clinicId: string;
  patientId?: string;
  /** SendGrid template ID (optional — for Phase 2 template system) */
  templateId?: string;
  templateData?: Record<string, string>;
}

export interface EmailResult {
  success: boolean;
  providerMessageId: string | null;
  error?: string;
}

export interface IEmailProvider {
  send(opts: SendEmailOptions): Promise<EmailResult>;
}

// ─── Stub Implementation ──────────────────────────────────────────────────────

export class StubEmailProvider implements IEmailProvider {
  async send(opts: SendEmailOptions): Promise<EmailResult> {
    const fakeId = `stub_email_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    console.log(
      `[EMAIL STUB] → ${opts.to}\n` +
      `  subject: ${opts.subject}\n` +
      `  clinicId: ${opts.clinicId}\n` +
      `  text: ${opts.text.slice(0, 80)}…\n` +
      `  fakeId: ${fakeId}`
    );

    await new Promise((r) => setTimeout(r, 50));

    return { success: true, providerMessageId: fakeId };
  }
}

// ─── Real SendGrid Implementation (wired up in Phase 2) ──────────────────────
// Uncomment and install `@sendgrid/mail` when ready:
//
// import sgMail from "@sendgrid/mail";
//
// export class SendGridEmailProvider implements IEmailProvider {
//   constructor() {
//     sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
//   }
//
//   async send(opts: SendEmailOptions): Promise<EmailResult> {
//     try {
//       const [response] = await sgMail.send({
//         to: opts.to,
//         from: process.env.SENDGRID_FROM_EMAIL!,
//         subject: opts.subject,
//         text: opts.text,
//         html: opts.html,
//       });
//       const msgId = response.headers["x-message-id"] ?? null;
//       return { success: true, providerMessageId: msgId };
//     } catch (err: any) {
//       return { success: false, providerMessageId: null, error: err.message };
//     }
//   }
// }

// ─── Active provider — swap this to SendGridEmailProvider when ready ──────────
export const emailProvider: IEmailProvider = new StubEmailProvider();
