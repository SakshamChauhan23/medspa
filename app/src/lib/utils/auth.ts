import { auth } from "@/lib/auth";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export interface AuthContext {
  userId: string;
  clinicId: string;
  role: "owner" | "admin" | "staff";
}

/**
 * Resolves the authenticated user and their associated clinic from Clerk JWT.
 * Returns a 401 NextResponse if unauthenticated, or 403 if the user has no clinic.
 */
export async function requireAuth(): Promise<
  AuthContext | NextResponse
> {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user] = await db
    .select({
      clinicId: users.clinicId,
      role: users.role,
    })
    .from(users)
    .where(eq(users.clerkUserId, userId))
    .limit(1);

  if (!user) {
    return NextResponse.json(
      { error: "User not found. Complete onboarding first." },
      { status: 403 }
    );
  }

  return {
    userId,
    clinicId: user.clinicId,
    role: user.role,
  };
}

export function isNextResponse(val: unknown): val is NextResponse {
  return val instanceof NextResponse;
}
