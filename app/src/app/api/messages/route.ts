import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messages, patients } from "@/lib/db/schema";
import { eq, and, desc, count } from "drizzle-orm";
import { requireAuth, isNextResponse } from "@/lib/utils/auth";

// GET /api/messages — list inbound messages requiring staff reply
export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  const { searchParams } = req.nextUrl;
  const unreadOnly = searchParams.get("unread") === "true";
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);

  const where = and(
    eq(messages.clinicId, auth.clinicId),
    eq(messages.direction, "inbound"),
    ...(unreadOnly ? [eq(messages.requiresStaffReply, true)] : [])
  );

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: messages.id,
        patientId: messages.patientId,
        channel: messages.channel,
        fromAddress: messages.fromAddress,
        body: messages.body,
        isStopKeyword: messages.isStopKeyword,
        requiresStaffReply: messages.requiresStaffReply,
        resolvedAt: messages.resolvedAt,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(where)
      .orderBy(desc(messages.createdAt))
      .limit(limit),
    db.select({ total: count() }).from(messages).where(where),
  ]);

  return NextResponse.json({ data: rows, total });
}
