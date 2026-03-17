import { Sidebar } from "@/components/layout/Sidebar";
import { auth, isStubAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { clinics, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

async function provisionUser(clerkUserId: string) {
  // Check if user already exists in DB
  const [existing] = await db
    .select({ clinicId: users.clinicId })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);

  if (existing) return existing.clinicId;

  // Auto-provision: webhook didn't fire (local dev) — create clinic + user now
  const [clinic] = await db
    .insert(clinics)
    .values({ name: "My Clinic", timezone: "America/New_York" })
    .returning({ id: clinics.id });

  await db.insert(users).values({
    clerkUserId,
    clinicId: clinic.id,
    role: "owner",
  });

  return null; // null = needs onboarding
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isStubAuth()) {
    const { userId } = await auth();
    if (!userId) redirect("/sign-in");

    const clinicId = await provisionUser(userId);

    if (!clinicId) {
      // Newly provisioned — send to onboarding
      redirect("/onboarding");
    }

    const [clinic] = await db
      .select({ setupCompletedAt: clinics.setupCompletedAt })
      .from(clinics)
      .where(eq(clinics.id, clinicId))
      .limit(1);

    if (!clinic?.setupCompletedAt) redirect("/onboarding");
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
