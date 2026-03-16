import { clsx } from "clsx";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "muted" | "accent";

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-[#FF6B35]/10 text-[#FF6B35]",
  success: "bg-[#14B8A6]/10 text-[#0D9488]",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-600",
  muted: "bg-[#F1F5F9] text-[#64748B]",
  accent: "bg-[#1E293B]/10 text-[#1E293B]",
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
