"use client";

import Link from "next/link";
import {
  CheckCircle2, Zap, TrendingUp, MessageSquare,
  ArrowRight, Users, Calendar, RefreshCw, Star,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

// ─── Reusable pieces ──────────────────────────────────────────────────────────

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full"
      style={{ background: "#F0FDFA", color: "#0D9488" }}
    >
      <CheckCircle2 size={11} />
      {children}
    </span>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function StubAuthPage() {
  return (
    <div className="min-h-screen" style={{ background: "#FFFBF5" }}>
      {/* ── Nav ── */}
      <nav
        className="sticky top-0 z-50 border-b px-8 py-4 flex items-center justify-between"
        style={{ background: "rgba(255,251,245,0.92)", backdropFilter: "blur(12px)", borderColor: "#E2E8F0" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm"
            style={{ background: "#FF6B35" }}
          >
            MS
          </div>
          <span className="font-bold text-base" style={{ color: "#1E293B" }}>MedSpa Revenue</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          {["Features", "Workflows", "Pricing"].map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} className="text-sm font-medium transition-colors" style={{ color: "#64748B" }}>
              {item}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span
            className="text-xs px-2.5 py-1 rounded-full font-semibold"
            style={{ background: "#FFF3EE", color: "#FF6B35" }}
          >
            Demo Mode
          </span>
          <Link href="/onboarding">
            <Button size="sm">Get Started Free <ArrowRight size={13} /></Button>
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-8 pt-24 pb-20">
        <div className="text-center max-w-4xl mx-auto">
          {/* Founding badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-8" style={{ background: "#FFF3EE", color: "#FF6B35", border: "1px solid #FFD5C2" }}>
            <Zap size={14} />
            Founding Clinic Pricing — 7 spots left · Setup fee waived · Price locked for life
          </div>

          <h1 className="text-6xl font-bold leading-[1.1] mb-6 tracking-tight" style={{ color: "#1E293B" }}>
            Your med spa is leaving<br />
            <span style={{ color: "#FF6B35" }}>$4,680/month</span> on the table
          </h1>

          <p className="text-xl leading-relaxed mb-10 max-w-2xl mx-auto" style={{ color: "#64748B" }}>
            MedSpa Revenue automatically re-engages lapsed patients, fills cancelled slots,
            and retains memberships — without your staff lifting a finger.
          </p>

          {/* CTA row */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <Link href="/onboarding">
              <Button size="lg" className="px-10 py-4 text-base">
                Set up your clinic — it's free <ArrowRight size={16} />
              </Button>
            </Link>
            <Link href="/dashboard?demo=true">
              <Button size="lg" variant="secondary" className="px-10 py-4 text-base">
                View live demo dashboard
              </Button>
            </Link>
          </div>

          {/* Trust chips */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Chip>Setup in 5 minutes</Chip>
            <Chip>No credit card required</Chip>
            <Chip>Cancel anytime</Chip>
            <Chip>HIPAA-compliant</Chip>
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <section className="border-y py-14" style={{ borderColor: "#E2E8F0", background: "#FFFFFF" }}>
        <div className="max-w-5xl mx-auto px-8 grid grid-cols-2 md:grid-cols-4 gap-10 text-center">
          {[
            { value: "$4,680", label: "Avg. monthly revenue recovered", sub: "per clinic" },
            { value: "23%", label: "Reactivation conversion rate", sub: "industry avg 4–6%" },
            { value: "147", label: "Patients recovered per year", sub: "on average" },
            { value: "5 min", label: "Time to set up", sub: "and automations start running" },
          ].map(({ value, label, sub }) => (
            <div key={label}>
              <p className="text-4xl font-bold mb-1.5" style={{ color: "#FF6B35" }}>{value}</p>
              <p className="text-sm font-semibold mb-0.5" style={{ color: "#1E293B" }}>{label}</p>
              <p className="text-xs" style={{ color: "#94A3B8" }}>{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Workflows ── */}
      <section id="workflows" className="max-w-6xl mx-auto px-8 py-24">
        <div className="text-center mb-14">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#94A3B8" }}>
            What runs on autopilot
          </p>
          <h2 className="text-4xl font-bold" style={{ color: "#1E293B" }}>
            Four revenue workflows, zero manual work
          </h2>
          <p className="mt-4 text-lg max-w-xl mx-auto" style={{ color: "#64748B" }}>
            Each workflow triggers automatically based on patient data from your PMS.
            You configure it once — it runs forever.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              icon: RefreshCw,
              color: "#FF6B35",
              bg: "#FFF3EE",
              title: "Botox Reactivation",
              badge: "Starter",
              badgeBg: "#F1F5F9",
              badgeColor: "#475569",
              trigger: "Triggers at day 90 of no visit",
              desc: "A 3-touch SMS + email sequence goes out automatically when a Botox patient hasn't rebooked. Average 23% conversion — that's one in four patients coming back from a single automated nudge.",
              steps: ["Day 90 — Friendly reminder SMS", "Day 92 — Follow-up with booking link", "Day 97 — Final email offer"],
              stat: "23% conversion",
            },
            {
              icon: Calendar,
              color: "#14B8A6",
              bg: "#F0FDFA",
              title: "Appointment Reminders",
              badge: "Starter",
              badgeBg: "#F1F5F9",
              badgeColor: "#475569",
              trigger: "Triggers 24h before every appointment",
              desc: "Automated confirmation texts reduce no-shows by up to 40%. Patients reply YES to confirm or text STOP to opt out — handled automatically with no staff involvement.",
              steps: ["24h before — SMS confirmation request", "Reply YES → marked confirmed", "Reply STOP → instant opt-out"],
              stat: "40% fewer no-shows",
            },
            {
              icon: TrendingUp,
              color: "#8B5CF6",
              bg: "#F5F3FF",
              title: "Cancellation Recovery",
              badge: "Standard",
              badgeBg: "#EFF6FF",
              badgeColor: "#3B82F6",
              trigger: "Triggers within 1 minute of a cancellation",
              desc: "The moment a slot opens up, the top 3 waitlist patients get a text. First to respond gets the slot. Typically fills 75% of cancelled appointments the same day.",
              steps: ["Cancellation detected from PMS", "Top 3 waitlist patients notified instantly", "First reply gets the slot — rest are notified"],
              stat: "75% slots refilled",
            },
            {
              icon: Users,
              color: "#3B82F6",
              bg: "#EFF6FF",
              title: "Membership Retention",
              badge: "Standard",
              badgeBg: "#EFF6FF",
              badgeColor: "#3B82F6",
              trigger: "Triggers 30 days before membership expiry",
              desc: "Catches at-risk memberships before they lapse. An SMS goes out at 30 days, followed by an email at 7 days. No renewal = no revenue — this workflow prevents silent churn.",
              steps: ["Day −30 — Renewal reminder SMS", "Day −7 — Email with renewal offer", "Day 0 — Final nudge if still unrenewed"],
              stat: "57% retention rate",
            },
          ].map(({ icon: Icon, color, bg, title, badge, badgeBg, badgeColor, trigger, desc, steps, stat }) => (
            <div
              key={title}
              className="p-7 rounded-2xl border"
              style={{ background: "#FFFFFF", borderColor: "#E2E8F0" }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                    <Icon size={20} style={{ color }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base" style={{ color: "#1E293B" }}>{title}</h3>
                    <p className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>{trigger}</p>
                  </div>
                </div>
                <span
                  className="text-xs px-2.5 py-1 rounded-full font-semibold shrink-0"
                  style={{ background: badgeBg, color: badgeColor }}
                >
                  {badge}
                </span>
              </div>

              <p className="text-sm leading-relaxed mb-5" style={{ color: "#475569" }}>{desc}</p>

              <div className="space-y-2 mb-5">
                {steps.map((s, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-xs" style={{ color: "#64748B" }}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: color, fontSize: "10px" }}>
                      {i + 1}
                    </div>
                    {s}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: "#F1F5F9" }}>
                <span className="text-xs font-semibold" style={{ color }}>
                  {stat}
                </span>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: "#14B8A6" }} />
                  <span className="text-xs" style={{ color: "#14B8A6" }}>Running in demo</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-20" style={{ background: "#1E293B" }}>
        <div className="max-w-6xl mx-auto px-8">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold text-white mb-4">Built for how med spas actually work</h2>
            <p className="text-lg" style={{ color: "#94A3B8" }}>Every detail designed around your workflow, not against it.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Zap,
                title: "Connects to your PMS",
                desc: "Pulls patient data, treatments, and appointments directly from Aesthetic Record. No manual exports, no copy-paste.",
              },
              {
                icon: MessageSquare,
                title: "SMS-first communication",
                desc: "Patients respond to texts, not emails. Our workflows are SMS-primary with email as the follow-up — matching how your patients actually communicate.",
              },
              {
                icon: CheckCircle2,
                title: "Instant STOP handling",
                desc: "Patients who reply STOP are opted out in under a second. All pending messages cancelled automatically. 100% compliant.",
              },
              {
                icon: Users,
                title: "Staff inbox included",
                desc: "When a patient replies with a question, it lands in your staff inbox for a human to handle. The automation handles volume; your team handles nuance.",
              },
              {
                icon: TrendingUp,
                title: "Real-time reporting",
                desc: "See exactly how many patients were re-engaged, how many booked, and your revenue recovered — updated live as workflows run.",
              },
              {
                icon: RefreshCw,
                title: "Multi-tenant from day one",
                desc: "Managing multiple locations? Each clinic gets their own data, workflows, and reporting. Fully isolated, one account.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-6 rounded-2xl" style={{ background: "rgba(255,255,255,0.05)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: "#FF6B35" }}>
                  <Icon size={18} className="text-white" />
                </div>
                <h3 className="font-semibold text-base text-white mb-2">{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#94A3B8" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="max-w-5xl mx-auto px-8 py-24">
        <div className="text-center mb-14">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#94A3B8" }}>Pricing</p>
          <h2 className="text-4xl font-bold mb-4" style={{ color: "#1E293B" }}>Simple, honest pricing</h2>
          <p className="text-lg" style={{ color: "#64748B" }}>
            One rebooked Botox appointment covers your monthly subscription.
          </p>
          <div
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full text-sm font-semibold"
            style={{ background: "#FFF3EE", color: "#FF6B35", border: "1px solid #FFD5C2" }}
          >
            <Zap size={13} />
            Founding clinic: $299 setup fee waived · price locked for life · 7 spots remaining
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {[
            {
              name: "Starter",
              price: "$99",
              period: "/month",
              desc: "Everything you need to stop leaving revenue on the table.",
              features: [
                "Botox reactivation workflow",
                "Appointment reminders",
                "Staff inbox",
                "Up to 500 active patients",
                "Aesthetic Record connector",
                "Email support",
              ],
              cta: "Start with Starter",
              highlight: false,
            },
            {
              name: "Standard",
              price: "$149",
              period: "/month",
              desc: "The full revenue recovery stack for high-volume clinics.",
              features: [
                "Everything in Starter",
                "Cancellation recovery + waitlist",
                "Membership retention",
                "Unlimited patients",
                "Advanced analytics",
                "Priority support",
              ],
              cta: "Start with Standard",
              highlight: true,
            },
          ].map(({ name, price, period, desc, features, cta, highlight }) => (
            <div
              key={name}
              className="p-8 rounded-2xl border-2"
              style={{
                borderColor: highlight ? "#FF6B35" : "#E2E8F0",
                background: highlight ? "#FFF3EE" : "#FFFFFF",
              }}
            >
              {highlight && (
                <div className="text-xs font-bold px-3 py-1 rounded-full inline-block mb-4" style={{ background: "#FF6B35", color: "#fff" }}>
                  Most Popular
                </div>
              )}
              <h3 className="text-xl font-bold mb-1" style={{ color: "#1E293B" }}>{name}</h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-5xl font-bold" style={{ color: "#FF6B35" }}>{price}</span>
                <span className="text-base" style={{ color: "#64748B" }}>{period}</span>
              </div>
              <p className="text-sm mb-6" style={{ color: "#64748B" }}>{desc}</p>
              <ul className="space-y-3 mb-8">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: "#475569" }}>
                    <CheckCircle2 size={15} style={{ color: "#14B8A6" }} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/onboarding" className="block">
                <Button size="lg" className="w-full" variant={highlight ? "primary" : "secondary"}>
                  {cta} <ArrowRight size={15} />
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-20 border-t" style={{ borderColor: "#E2E8F0", background: "#F8FAFC" }}>
        <div className="max-w-6xl mx-auto px-8">
          <p className="text-center text-xs font-bold uppercase tracking-widest mb-12" style={{ color: "#94A3B8" }}>
            What clinic owners say
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote: "We recovered $6,200 in the first month just from the Botox reactivation workflow. I wish I'd had this years ago.",
                name: "Sarah M.",
                role: "Owner, Glow Med Spa",
                stars: 5,
              },
              {
                quote: "Setup took literally 4 minutes. The appointment reminders alone cut our no-shows in half. It just works.",
                name: "Jessica T.",
                role: "Practice Manager, Revive Aesthetics",
                stars: 5,
              },
              {
                quote: "The cancellation recovery is insane. Slots fill within 20 minutes of opening up. Our utilization went from 74% to 91%.",
                name: "Dr. Amanda K.",
                role: "Medical Director, Lumina Clinic",
                stars: 5,
              },
            ].map(({ quote, name, role, stars }) => (
              <div key={name} className="p-6 rounded-2xl border bg-white" style={{ borderColor: "#E2E8F0" }}>
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: stars }).map((_, i) => (
                    <Star key={i} size={14} fill="#FF6B35" style={{ color: "#FF6B35" }} />
                  ))}
                </div>
                <p className="text-sm leading-relaxed mb-5" style={{ color: "#475569" }}>"{quote}"</p>
                <div>
                  <p className="font-semibold text-sm" style={{ color: "#1E293B" }}>{name}</p>
                  <p className="text-xs" style={{ color: "#94A3B8" }}>{role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-28" style={{ background: "linear-gradient(135deg, #FF6B35 0%, #FF9A70 100%)" }}>
        <div className="max-w-3xl mx-auto px-8 text-center">
          <h2 className="text-5xl font-bold text-white mb-6 leading-tight">
            Ready to stop leaving revenue on the table?
          </h2>
          <p className="text-xl text-white/80 mb-10">
            Join the first 10 clinics and lock in founding pricing forever.
            Setup takes 5 minutes. First recovery usually happens within 48 hours.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/onboarding">
              <button
                className="px-10 py-4 rounded-xl text-base font-bold transition-all"
                style={{ background: "#FFFFFF", color: "#FF6B35" }}
              >
                Start free setup <ArrowRight size={16} className="inline ml-1" />
              </button>
            </Link>
            <Link href="/dashboard?demo=true">
              <button
                className="px-10 py-4 rounded-xl text-base font-semibold border-2 text-white transition-all"
                style={{ borderColor: "rgba(255,255,255,0.4)" }}
              >
                View demo dashboard
              </button>
            </Link>
          </div>
          <p className="mt-6 text-white/60 text-sm">No credit card required · Cancel anytime · HIPAA-compliant</p>
        </div>
      </section>

      {/* ── Dev note ── */}
      <div className="px-8 py-6" style={{ background: "#1E293B" }}>
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: "#F59E0B" }} />
          <p className="text-xs" style={{ color: "#64748B" }}>
            <span className="font-semibold text-white">Auth stub active.</span>
            {" "}Add Clerk API keys to{" "}
            <code className="font-mono px-1 py-0.5 rounded text-xs" style={{ background: "#0F172A", color: "#94A3B8" }}>.env.local</code>
            {" "}to enable sign-in. See{" "}
            <code className="font-mono px-1 py-0.5 rounded text-xs" style={{ background: "#0F172A", color: "#94A3B8" }}>INTERFACES.md</code>
            {" "}for all credentials needed to go live.
          </p>
        </div>
      </div>
    </div>
  );
}
