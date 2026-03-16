import { isStubAuth } from "@/lib/auth";
import { StubAuthPage } from "@/components/auth/StubAuthPage";

async function RealSignUpPage() {
  const { SignUp } = await import("@clerk/nextjs");
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#FFFBF5" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ background: "#FF6B35" }}
            >
              MS
            </div>
            <span className="text-xl font-semibold" style={{ color: "#1E293B" }}>
              MedSpa Revenue
            </span>
          </div>
          <p className="text-sm" style={{ color: "#64748B" }}>
            Revenue Recovery & Retention Infrastructure
          </p>
        </div>
        <SignUp
          appearance={{
            variables: {
              colorPrimary: "#FF6B35",
              colorBackground: "#FFFFFF",
              colorText: "#1E293B",
              borderRadius: "0.625rem",
            },
          }}
        />
      </div>
    </div>
  );
}

export default async function SignUpPage() {
  if (isStubAuth()) return <StubAuthPage />;
  return <RealSignUpPage />;
}
