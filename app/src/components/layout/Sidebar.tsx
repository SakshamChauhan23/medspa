"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users, LayoutDashboard, Plug, Settings,
  Zap, MessageSquare, CreditCard,
} from "lucide-react";
import dynamic from "next/dynamic";

const SignOutButton = dynamic(
  () => import("@/components/auth/SignOutButton").then((m) => m.SignOutButton),
  { ssr: false }
);

const mainNavItems = [
  { label: "Overview",     href: "/dashboard",    icon: LayoutDashboard },
  { label: "Patients",     href: "/patients",     icon: Users           },
  { label: "Integrations", href: "/integrations", icon: Plug            },
  { label: "Settings",     href: "/settings",     icon: Settings        },
];

const automationNavItems = [
  { label: "Automations", href: "/automations", icon: Zap            },
  { label: "Inbox",       href: "/inbox",       icon: MessageSquare  },
  { label: "Billing",     href: "/billing",     icon: CreditCard     },
];

function NavItem({ href, label, Icon }: { href: string; label: string; Icon: React.ElementType }) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
        style={{ color: isActive ? "#FFFFFF" : "#94A3B8", background: isActive ? "#FF6B35" : "transparent" }}
        onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#FFFFFF"; } }}
        onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94A3B8"; } }}
      >
        <Icon size={16} strokeWidth={2} />
        {label}
      </Link>
    </li>
  );
}

// Check if Clerk is configured (NEXT_PUBLIC_ vars are inlined at build time)
const hasClerk = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.endsWith("...")
);

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 flex flex-col w-60 z-50" style={{ background: "#1E293B" }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0" style={{ background: "#FF6B35" }}>
          MS
        </div>
        <div className="min-w-0">
          <p className="text-white font-semibold text-sm leading-tight truncate">MedSpa Revenue</p>
          <p className="text-xs truncate" style={{ color: "#64748B" }}>Revenue System</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <p className="px-2 mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "#475569" }}>Main</p>
        <ul className="space-y-0.5">
          {mainNavItems.map((item) => <NavItem key={item.href} href={item.href} label={item.label} Icon={item.icon} />)}
        </ul>

        <div className="mt-6">
          <p className="px-2 mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "#475569" }}>Automation</p>
          <ul className="space-y-0.5">
            {automationNavItems.map((item) => <NavItem key={item.href} href={item.href} label={item.label} Icon={item.icon} />)}
          </ul>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/10 space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0" style={{ background: "#FF6B35" }}>
            MS
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-sm font-medium truncate">Account</p>
            <p className="text-xs truncate" style={{ color: "#64748B" }}>Manage profile</p>
          </div>
        </div>
        {hasClerk && <SignOutButton />}
      </div>
    </aside>
  );
}
