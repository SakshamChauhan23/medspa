"use client";

import { useState } from "react";
import { MessageSquare, Mail } from "lucide-react";

interface OptOutToggleProps {
  patientId: string;
  smsOptOut: boolean;
  emailOptOut: boolean;
}

export function OptOutToggle({
  patientId,
  smsOptOut: initialSms,
  emailOptOut: initialEmail,
}: OptOutToggleProps) {
  const [smsOptOut, setSmsOptOut] = useState(initialSms);
  const [emailOptOut, setEmailOptOut] = useState(initialEmail);
  const [loading, setLoading] = useState(false);

  async function toggle(field: "sms" | "email", value: boolean) {
    setLoading(true);
    try {
      await fetch(`/api/patients/${patientId}/opt-out`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smsOptOut: field === "sms" ? value : smsOptOut,
          emailOptOut: field === "email" ? value : emailOptOut,
          source: "admin",
        }),
      });
      if (field === "sms") setSmsOptOut(value);
      else setEmailOptOut(value);
    } catch {
      alert("Failed to update preference. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {[
        {
          field: "sms" as const,
          label: "SMS Messages",
          description: "Reminders and reactivation texts",
          icon: MessageSquare,
          isOptedOut: smsOptOut,
        },
        {
          field: "email" as const,
          label: "Email Messages",
          description: "Follow-ups and reminders via email",
          icon: Mail,
          isOptedOut: emailOptOut,
        },
      ].map(({ field, label, description, icon: Icon, isOptedOut }) => (
        <div key={field} className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Icon
              size={14}
              style={{ color: isOptedOut ? "#94A3B8" : "#FF6B35" }}
            />
            <div>
              <p className="text-sm font-medium" style={{ color: "#1E293B" }}>
                {label}
              </p>
              <p className="text-xs" style={{ color: "#94A3B8" }}>
                {description}
              </p>
            </div>
          </div>
          <button
            disabled={loading}
            onClick={() => toggle(field, !isOptedOut)}
            className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 disabled:opacity-50"
            style={{
              background: isOptedOut ? "#E2E8F0" : "#FF6B35",
            }}
            aria-label={`${isOptedOut ? "Enable" : "Disable"} ${label}`}
          >
            <span
              className="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 mt-0.5"
              style={{
                transform: isOptedOut ? "translateX(2px)" : "translateX(18px)",
              }}
            />
          </button>
        </div>
      ))}
      <p className="text-xs pt-1" style={{ color: "#94A3B8" }}>
        When SMS is disabled, the patient will not receive any automated
        messages. STOP replies are processed instantly and cannot be overridden.
      </p>
    </div>
  );
}
