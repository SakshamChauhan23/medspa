import { clsx } from "clsx";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
  style?: React.CSSProperties;
}

const paddingMap = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({ children, className, padding = "md", style }: CardProps) {
  return (
    <div
      className={clsx(
        "bg-white rounded-xl border",
        paddingMap[padding],
        className
      )}
      style={{ borderColor: "#E2E8F0", ...style }}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("flex items-center justify-between mb-4", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={clsx("text-base font-semibold", className)} style={{ color: "#1E293B" }}>
      {children}
    </h3>
  );
}
