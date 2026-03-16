import { Sidebar } from "@/components/layout/Sidebar";
import { auth, isStubAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { clinics, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isStubAuth()) {
    const { userId } = await auth();
    if (!userId) redirect("/sign-in");

    // Redirect new users to onboarding if they haven't completed setup
    const [user] = await db
      .select({ clinicId: users.clinicId })
      .from(users)
      .where(eq(users.clerkUserId, userId))
      .limit(1);

    if (user?.clinicId) {
      const [clinic] = await db
        .select({ setupCompletedAt: clinics.setupCompletedAt })
        .from(clinics)
        .where(eq(clinics.id, user.clinicId))
        .limit(1);

      if (!clinic?.setupCompletedAt) redirect("/onboarding");
    }
  }

  return (
    <div className="flex min-h-screen" style={{ background: "#FFFBF5" }}>
      <Sidebar />
      <main className="flex-1 ml-60 min-w-0">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
