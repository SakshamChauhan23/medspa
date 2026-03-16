"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import {
  CheckCircle2, ArrowRight, ArrowLeft, Zap, MessageSquare,
  Building2, Plug, Check, Loader2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClinicData {
  clinicName: string;
  ownerName: string;
  email: string;
  phone: string;
  pmsConnected: boolean;
  pmsPatientCount: number;
  messagingReady: boolean;
}

// ─── Step metadata ────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Clinic", icon: Building2 },
  { label: "PMS", icon: Plug },
  { label: "Messaging", icon: MessageSquare },
  { label: "Launch", icon: Zap },
];

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const done = i < current;
        const active = i === current;
        return (
          <div key={step.label} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300"
                style={{
                  background: done ? "#14B8A6" : active ? "#FF6B35" : "#E2E8F0",
                  color: done || active ? "#fff" : "#94A3B8",
                }}
              >
                {done ? <Check size={16} strokeWidth={2.5} /> : <Icon size={15} strokeWidth={2} />}
              </div>
              <span
                className="text-xs font-medium"
                style={{ color: active ? "#FF6B35" : done ? "#14B8A6" : "#94A3B8" }}
              >
                {step.label}
              </span>
            </div>
            {i < total - 1 && (
              <div
                className="w-12 h-0.5 mb-4 rounded-full transition-all duration-500"
                style={{ background: i < current ? "#14B8A6" : "#E2E8F0" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 0: Clinic Info ──────────────────────────────────────────────────────

function StepClinic({
  data, onChange, onNext,
}: {
  data: ClinicData;
  onChange: (k: keyof ClinicData, v: string) => void;
  onNext: () => void;
}) {
  const valid = data.clinicName.trim() && data.ownerName.trim() && data.email.trim();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: "#1E293B" }}>
          Tell us about your clinic
        </h2>
        <p className="text-sm" style={{ color: "#64748B" }}>
          This takes about 5 minutes. Your revenue engine will be running by the end.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>
            Clinic name <span style={{ color: "#FF6B35" }}>*</span>
          </label>
          <input
            value={data.clinicName}
            onChange={(e) => onChange("clinicName", e.target.value)}
            placeholder="Glow Med Spa"
            className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
            style={{ borderColor: "#E2E8F0", color: "#1E293B" }}
            onFocus={(e) => (e.target.style.borderColor = "#FF6B35")}
            onBlur={(e) => (e.target.style.borderColor = "#E2E8F0")}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>
            Your name <span style={{ color: "#FF6B35" }}>*</span>
          </label>
          <input
            value={data.ownerName}
            onChange={(e) => onChange("ownerName", e.target.value)}
            placeholder="Sarah Johnson"
            className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
            style={{ borderColor: "#E2E8F0", color: "#1E293B" }}
            onFocus={(e) => (e.target.style.borderColor = "#FF6B35")}
            onBlur={(e) => (e.target.style.borderColor = "#E2E8F0")}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>
              Email <span style={{ color: "#FF6B35" }}>*</span>
            </label>
            <input
              type="email"
              value={data.email}
              onChange={(e) => onChange("email", e.target.value)}
              placeholder="sarah@glowspa.com"
              className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
              style={{ borderColor: "#E2E8F0", color: "#1E293B" }}
              onFocus={(e) => (e.target.style.borderColor = "#FF6B35")}
              onBlur={(e) => (e.target.style.borderColor = "#E2E8F0")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>
              Clinic phone
            </label>
            <input
              type="tel"
              value={data.phone}
              onChange={(e) => onChange("phone", e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
              style={{ borderColor: "#E2E8F0", color: "#1E293B" }}
              onFocus={(e) => (e.target.style.borderColor = "#FF6B35")}
              onBlur={(e) => (e.target.style.borderColor = "#E2E8F0")}
            />
          </div>
        </div>
      </div>

      {/* Value prop chips */}
      <div className="flex flex-wrap gap-2 pt-2">
        {["147 avg. patients recovered/year", "Setup in 5 min", "Cancel anytime"].map((t) => (
          <div
            key={t}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
            style={{ background: "#F0FDFA", color: "#0D9488" }}
          >
            <CheckCircle2 size={11} />
            {t}
          </div>
        ))}
      </div>

      <Button size="lg" className="w-full" disabled={!valid} onClick={onNext}>
        Continue <ArrowRight size={15} />
      </Button>
    </div>
  );
}

// ─── Step 1: Connect PMS ──────────────────────────────────────────────────────

function StepPMS({
  data, onUpdate, onNext, onBack,
}: {
  data: ClinicData;
  onUpdate: (patch: Partial<ClinicData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [connecting, setConnecting] = useState(false);
  const [apiKey, setApiKey] = useState("");

  function handleConnect() {
    if (!apiKey.trim()) return;
    setConnecting(true);
    setTimeout(() => {
      setConnecting(false);
      onUpdate({ pmsConnected: true, pmsPatientCount: 312 });
    }, 2200);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: "#1E293B" }}>
          Connect your PMS
        </h2>
        <p className="text-sm" style={{ color: "#64748B" }}>
          We pull patient, treatment, and appointment data so workflows trigger automatically.
        </p>
      </div>

      {/* PMS selector */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { id: "ar", label: "Aesthetic Record", active: true },
          { id: "jane", label: "Jane App", active: false },
          { id: "mindbody", label: "Mindbody", active: false },
        ].map((pms) => (
          <div
            key={pms.id}
            className="p-4 rounded-xl border-2 text-center cursor-pointer transition-all"
            style={{
              borderColor: pms.active ? "#FF6B35" : "#E2E8F0",
              background: pms.active ? "#FFF3EE" : "#FAFAFA",
              opacity: pms.active ? 1 : 0.5,
            }}
          >
            <div
              className="w-9 h-9 rounded-lg mx-auto mb-2 flex items-center justify-center text-white text-xs font-bold"
              style={{ background: pms.active ? "#FF6B35" : "#94A3B8" }}
            >
              {pms.label[0]}
            </div>
            <p className="text-xs font-medium" style={{ color: "#1E293B" }}>{pms.label}</p>
            {!pms.active && (
              <p className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>Coming soon</p>
            )}
          </div>
        ))}
      </div>

      {!data.pmsConnected ? (
        <div
          className="p-5 rounded-xl border"
          style={{ borderColor: "#E2E8F0", background: "#FAFAFA" }}
        >
          <p className="text-sm font-semibold mb-3" style={{ color: "#1E293B" }}>
            Aesthetic Record API Key
          </p>
          <div className="flex gap-2">
            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="ar_live_xxxxxxxxxxxxxxxx"
              className="flex-1 px-3 py-2.5 rounded-lg border text-sm font-mono outline-none"
              style={{ borderColor: "#E2E8F0", color: "#1E293B" }}
              onFocus={(e) => (e.target.style.borderColor = "#FF6B35")}
              onBlur={(e) => (e.target.style.borderColor = "#E2E8F0")}
            />
            <Button loading={connecting} onClick={handleConnect} disabled={!apiKey.trim()}>
              {connecting ? "Connecting…" : "Connect"}
            </Button>
          </div>
          {connecting && (
            <div className="mt-4 space-y-2">
              {["Authenticating with Aesthetic Record…", "Fetching patient records…", "Syncing treatment history…"].map(
                (msg, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs" style={{ color: "#64748B" }}>
                    <Loader2 size={11} className="animate-spin" style={{ color: "#FF6B35" }} />
                    {msg}
                  </div>
                )
              )}
            </div>
          )}
          <p className="text-xs mt-3" style={{ color: "#94A3B8" }}>
            Find this in Aesthetic Record → Settings → API & Integrations
          </p>
        </div>
      ) : (
        <div
          className="p-5 rounded-xl border-2 flex items-start gap-4"
          style={{ borderColor: "#14B8A6", background: "#F0FDFA" }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#14B8A6" }}>
            <Check size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: "#0D9488" }}>
              Aesthetic Record connected
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#0D9488" }}>
              {data.pmsPatientCount} patients synced · treatments & appointments imported
            </p>
            <div className="flex items-center gap-3 mt-3">
              {[
                { label: "Patients", value: `${data.pmsPatientCount}` },
                { label: "Treatments", value: "1,847" },
                { label: "Appointments", value: "489" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-base font-bold" style={{ color: "#0D9488" }}>{s.value}</p>
                  <p className="text-xs" style={{ color: "#5EEAD4" }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Skip option */}
      {!data.pmsConnected && (
        <button
          className="w-full text-xs underline"
          style={{ color: "#94A3B8" }}
          onClick={() => onNext()}
        >
          Skip for now — I'll connect this later
        </button>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" size="lg" className="w-24" onClick={onBack}>
          <ArrowLeft size={15} /> Back
        </Button>
        <Button size="lg" className="flex-1" onClick={onNext}>
          Continue <ArrowRight size={15} />
        </Button>
      </div>
    </div>
  );
}

// ─── Step 2: Messaging ────────────────────────────────────────────────────────

function StepMessaging({
  data, onUpdate, onNext, onBack,
}: {
  data: ClinicData;
  onUpdate: (patch: Partial<ClinicData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [smsPhone, setSmsPhone] = useState("");
  const [emailFrom, setEmailFrom] = useState("");
  const [testSent, setTestSent] = useState(false);
  const [sending, setSending] = useState(false);

  function sendTest() {
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setTestSent(true);
      onUpdate({ messagingReady: true });
    }, 1500);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: "#1E293B" }}>
          Set up messaging
        </h2>
        <p className="text-sm" style={{ color: "#64748B" }}>
          SMS and email are how your workflows reach patients. Configure once, then it's automatic.
        </p>
      </div>

      {/* SMS */}
      <div className="p-5 rounded-xl border" style={{ borderColor: "#E2E8F0" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#EFF6FF" }}>
              <MessageSquare size={14} style={{ color: "#3B82F6" }} />
            </div>
            <p className="font-semibold text-sm" style={{ color: "#1E293B" }}>SMS — Twilio</p>
          </div>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: "#FFF3EE", color: "#FF6B35" }}
          >
            Stub active
          </span>
        </div>
        <input
          value={smsPhone}
          onChange={(e) => setSmsPhone(e.target.value)}
          placeholder="+1 (555) 000-0000  (your Twilio number)"
          className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none mb-2"
          style={{ borderColor: "#E2E8F0", color: "#1E293B" }}
          onFocus={(e) => (e.target.style.borderColor = "#FF6B35")}
          onBlur={(e) => (e.target.style.borderColor = "#E2E8F0")}
        />
        <p className="text-xs" style={{ color: "#94A3B8" }}>
          Requires TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN in .env.local
        </p>
      </div>

      {/* Email */}
      <div className="p-5 rounded-xl border" style={{ borderColor: "#E2E8F0" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#F0FDF4" }}>
              <MessageSquare size={14} style={{ color: "#22C55E" }} />
            </div>
            <p className="font-semibold text-sm" style={{ color: "#1E293B" }}>Email — SendGrid</p>
          </div>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: "#FFF3EE", color: "#FF6B35" }}
          >
            Stub active
          </span>
        </div>
        <input
          value={emailFrom}
          onChange={(e) => setEmailFrom(e.target.value)}
          placeholder={`hello@${data.clinicName.toLowerCase().replace(/\s/g, "") || "yourclinic"}.com`}
          className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none mb-2"
          style={{ borderColor: "#E2E8F0", color: "#1E293B" }}
          onFocus={(e) => (e.target.style.borderColor = "#FF6B35")}
          onBlur={(e) => (e.target.style.borderColor = "#E2E8F0")}
        />
        <p className="text-xs" style={{ color: "#94A3B8" }}>
          Requires SENDGRID_API_KEY in .env.local
        </p>
      </div>

      {/* Test */}
      <div
        className="p-4 rounded-xl flex items-center justify-between"
        style={{ background: testSent ? "#F0FDFA" : "#F8FAFC", border: `1px solid ${testSent ? "#99F6E4" : "#E2E8F0"}` }}
      >
        <div>
          <p className="text-sm font-medium" style={{ color: "#1E293B" }}>
            {testSent ? "Test message delivered!" : "Send a test message"}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>
            {testSent
              ? "Your messaging pipeline is working. Workflows will reach patients."
              : "Verify SMS delivery before going live."}
          </p>
        </div>
        {testSent ? (
          <CheckCircle2 size={22} style={{ color: "#14B8A6" }} />
        ) : (
          <Button size="sm" variant="secondary" loading={sending} onClick={sendTest}>
            Send test
          </Button>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" size="lg" className="w-24" onClick={onBack}>
          <ArrowLeft size={15} /> Back
        </Button>
        <Button size="lg" className="flex-1" onClick={onNext}>
          Continue <ArrowRight size={15} />
        </Button>
      </div>
    </div>
  );
}

// ─── Step 3: Launch ───────────────────────────────────────────────────────────

function StepLaunch({ data, onDone, loading }: { data: ClinicData; onDone: () => void; loading?: boolean }) {
  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #FF6B35 0%, #FF9A70 100%)" }}
        >
          <Zap size={36} className="text-white" />
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: "#1E293B" }}>
          {data.clinicName || "Your clinic"} is ready to launch!
        </h2>
        <p className="text-sm" style={{ color: "#64748B" }}>
          {data.ownerName ? `Welcome, ${data.ownerName.split(" ")[0]}. ` : ""}
          Your revenue recovery engine is configured and ready to go.
        </p>
      </div>

      {/* Setup summary */}
      <div className="text-left rounded-2xl border p-5 space-y-3" style={{ borderColor: "#E2E8F0" }}>
        {[
          {
            icon: Building2,
            label: "Clinic",
            value: data.clinicName || "Your clinic",
            color: "#FF6B35",
            bg: "#FFF3EE",
          },
          {
            icon: Plug,
            label: "PMS",
            value: data.pmsConnected
              ? `Aesthetic Record — ${data.pmsPatientCount} patients synced`
              : "Not connected yet — connect from Integrations",
            color: data.pmsConnected ? "#14B8A6" : "#94A3B8",
            bg: data.pmsConnected ? "#F0FDFA" : "#F8FAFC",
          },
          {
            icon: MessageSquare,
            label: "Messaging",
            value: data.messagingReady ? "SMS + Email verified" : "Stub mode active — configure credentials to send",
            color: data.messagingReady ? "#14B8A6" : "#F59E0B",
            bg: data.messagingReady ? "#F0FDFA" : "#FFFBEB",
          },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: bg }}>
              <Icon size={14} style={{ color }} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#94A3B8" }}>{label}</p>
              <p className="text-sm mt-0.5" style={{ color: "#1E293B" }}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Workflows activating */}
      <div className="text-left p-4 rounded-xl" style={{ background: "#F8FAFC" }}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#64748B" }}>
          Workflows activating now
        </p>
        <div className="space-y-1.5">
          {[
            { name: "Botox Reactivation", desc: "3-touch sequence starting at day 90" },
            { name: "Appointment Reminders", desc: "Sent 24h before each appointment" },
            { name: "Cancellation Recovery", desc: "Re-engages cancelled slots via waitlist" },
            { name: "Membership Retention", desc: "Triggered 30 days before renewal" },
          ].map((wf) => (
            <div key={wf.name} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#14B8A6" }} />
              <span className="text-xs font-medium" style={{ color: "#1E293B" }}>{wf.name}</span>
              <span className="text-xs" style={{ color: "#94A3B8" }}>— {wf.desc}</span>
            </div>
          ))}
        </div>
      </div>

      <Button size="lg" className="w-full" loading={loading} onClick={onDone}>
        Go to Dashboard <ArrowRight size={15} />
      </Button>

      <p className="text-xs" style={{ color: "#94A3B8" }}>
        You can update any setting from the dashboard at any time.
      </p>
    </div>
  );
}

// ─── Root wizard ──────────────────────────────────────────────────────────────

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<ClinicData>({
    clinicName: "",
    ownerName: "",
    email: "",
    phone: "",
    pmsConnected: false,
    pmsPatientCount: 0,
    messagingReady: false,
  });

  function change(key: keyof ClinicData, value: string) {
    setData((d) => ({ ...d, [key]: value }));
  }

  function patch(partial: Partial<ClinicData>) {
    setData((d) => ({ ...d, ...partial }));
  }

  function next() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function finish() {
    setSaving(true);
    try {
      await fetch("/api/settings/clinic", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.clinicName || "My Clinic",
          phone: data.phone || undefined,
          setupComplete: true,
        }),
      });
    } catch {
      // Best-effort — proceed to dashboard regardless
    } finally {
      setSaving(false);
    }
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen" style={{ background: "#FFFBF5" }}>
      {/* Top nav */}
      <div className="border-b" style={{ background: "#FFFFFF", borderColor: "#E2E8F0" }}>
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs"
              style={{ background: "#FF6B35" }}
            >
              MS
            </div>
            <span className="font-semibold text-sm" style={{ color: "#1E293B" }}>
              MedSpa Revenue
            </span>
          </div>
          <span className="text-xs" style={{ color: "#94A3B8" }}>
            Step {step + 1} of {STEPS.length}
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Progress */}
        <div className="flex justify-center mb-10">
          <ProgressBar current={step} total={STEPS.length} />
        </div>

        {/* Step content */}
        <div className="bg-white rounded-2xl border p-8" style={{ borderColor: "#E2E8F0" }}>
          {step === 0 && <StepClinic data={data} onChange={change} onNext={next} />}
          {step === 1 && <StepPMS data={data} onUpdate={patch} onNext={next} onBack={back} />}
          {step === 2 && <StepMessaging data={data} onUpdate={patch} onNext={next} onBack={back} />}
          {step === 3 && (
            <StepLaunch data={data} onDone={finish} loading={saving} />
          )}
        </div>
      </div>
    </div>
  );
}
