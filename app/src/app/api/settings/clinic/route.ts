import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clinics, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user] = await db.select({ clinicId: users.clinicId }).from(users).where(eq(users.clerkUserId, userId)).limit(1);
  if (!user?.clinicId) return NextResponse.json({ error: "Clinic not found" }, { status: 404 });

  const body = await req.json();
  const { name, phone, timezone, setupComplete } = body as {
    name?: string;
    phone?: string;
    timezone?: string;
    setupComplete?: boolean;
  };

  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  await db
    .update(clinics)
    .set({
      name: name.trim(),
      phone: phone?.trim() || null,
      timezone: timezone ?? undefined,
      ...(setupComplete ? { setupCompletedAt: new Date() } : {}),
      updatedAt: new Date(),
    })
    .where(eq(clinics.id, user.clinicId));

  return NextResponse.json({ ok: true });
}
