/**
 * Template Engine
 * Replaces {{token}} placeholders in message bodies.
 * Tokens match the PRD spec: patient_name, clinic_name, treatment_type, booking_link
 */

export interface TemplateContext {
  patient_name: string;
  clinic_name: string;
  treatment_type?: string;
  booking_link?: string;
  appointment_date?: string;
  membership_expiry?: string;
  sessions_remaining?: string | number;
  slot_time?: string;           // cancellation recovery
  [key: string]: string | number | undefined;
}

const TOKEN_REGEX = /\{\{(\w+)\}\}/g;

export function renderTemplate(template: string, context: TemplateContext): string {
  return template.replace(TOKEN_REGEX, (match, key) => {
    const value = context[key];
    if (value === undefined || value === null) {
      // Leave token as-is rather than rendering "undefined" — visible sign in stub mode
      return match;
    }
    return String(value);
  });
}

// ─── Default system templates ─────────────────────────────────────────────────
// These are seeded on onboarding. Clinics can edit them via admin panel (Phase 3).

export const DEFAULT_TEMPLATES = {
  botox_reactivation: {
    sms_step1: {
      name: "Botox Reactivation — SMS 1",
      body: "Hi {{patient_name}}, it's {{clinic_name}}! It's been about 3 months since your last Botox treatment. Ready to book your next session? {{booking_link}}",
    },
    email_step2: {
      name: "Botox Reactivation — Email",
      subject: "Time for your next Botox treatment, {{patient_name}}",
      body: `Hi {{patient_name}},

We noticed it's been a while since your last Botox appointment at {{clinic_name}}.

For best results, Botox is recommended every 3–4 months. Now is a great time to lock in your next session before your calendar fills up.

Book your appointment here: {{booking_link}}

See you soon,
The {{clinic_name}} Team`,
    },
    sms_step3: {
      name: "Botox Reactivation — Final SMS",
      body: "Hi {{patient_name}}, last reminder from {{clinic_name}} — your Botox cycle is overdue. Book now: {{booking_link}}. Reply STOP to unsubscribe.",
    },
  },

  appointment_reminder: {
    sms_step1: {
      name: "Appointment Reminder — 24h SMS",
      body: "Hi {{patient_name}}, reminder: you have an appointment at {{clinic_name}} tomorrow{{appointment_date}}. Reply YES to confirm or call us to reschedule.",
    },
    sms_step2: {
      name: "Appointment Confirmation Request",
      body: "Hi {{patient_name}}, your appointment at {{clinic_name}} is coming up soon. Please reply YES to confirm your spot, or NO if you need to reschedule.",
    },
    sms_followup: {
      name: "Appointment Reminder — Follow-up",
      body: "Hi {{patient_name}}, we haven't heard from you yet. Your appointment at {{clinic_name}} is today. Reply YES to confirm. {{booking_link}}",
    },
  },

  cancellation_recovery: {
    sms_step1: {
      name: "Cancellation Recovery — Waitlist SMS",
      body: "Hi {{patient_name}}, great news from {{clinic_name}}! A {{slot_time}} slot just opened up. Reply YES to grab it — first reply gets the spot. {{booking_link}}",
    },
  },

  membership_retention: {
    email_step1: {
      name: "Membership Renewal — 30 Day Email",
      subject: "Your {{clinic_name}} membership expires on {{membership_expiry}}",
      body: `Hi {{patient_name}},

Your {{clinic_name}} membership is expiring on {{membership_expiry}}.

Renew now to keep enjoying your exclusive member benefits without interruption.

Renew here: {{booking_link}}

Thank you for being a valued member,
The {{clinic_name}} Team`,
    },
    sms_step2: {
      name: "Membership Renewal — 7 Day SMS",
      body: "Hi {{patient_name}}, your {{clinic_name}} membership expires in 7 days ({{membership_expiry}}). Renew now: {{booking_link}}",
    },
    sms_step3: {
      name: "Membership Renewal — Final SMS",
      body: "Hi {{patient_name}}, last day to renew your {{clinic_name}} membership before it expires. Renew here: {{booking_link}}. Reply STOP to unsubscribe.",
    },
  },
} as const;
