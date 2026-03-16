import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get Started — MedSpa Revenue",
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "#FFFBF5" }}>
      {children}
    </div>
  );
}
