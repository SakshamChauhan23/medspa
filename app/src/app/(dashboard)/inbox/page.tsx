import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { messages, patients, users } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { MessageSquare, Phone, Mail } from "lucide-react";
import { InboxReplyForm } from "@/components/inbox/InboxReplyForm";

async function getClinicId(userId: string) {
  const [user] = await db.select({ clinicId: users.clinicId }).from(users).where(eq(users.clerkUserId, userId)).limit(1);
  return user?.clinicId ?? null;
}

function timeAgo(date: Date | string | null): string {
  if (!date) return "";
  const d = new Date(date);
  const diffMs = Date.now() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function InboxPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const clinicId = await getClinicId(userId);
  if (!clinicId) redirect("/dashboard");

  const inboundMessages = await db
    .select({
      id: messages.id,
      patientId: messages.patientId,
      channel: messages.channel,
      body: messages.body,
      isStopKeyword: messages.isStopKeyword,
      requiresStaffReply: messages.requiresStaffReply,
      resolvedAt: messages.resolvedAt,
      createdAt: messages.createdAt,
      patientFirstName: patients.firstName,
      patientLastName: patients.lastName,
    })
    .from(messages)
    .leftJoin(patients, eq(messages.patientId, patients.id))
    .where(and(eq(messages.clinicId, clinicId), eq(messages.direction, "inbound")))
    .orderBy(desc(messages.createdAt))
    .limit(50);

  const unresolved = inboundMessages
    .filter((m) => m.requiresStaffReply && !m.resolvedAt)
    .map((m) => ({ ...m, body: m.body ?? "", timeAgo: timeAgo(m.createdAt) }));
  const resolved = inboundMessages
    .filter((m) => !m.requiresStaffReply || m.resolvedAt)
    .map((m) => ({ ...m, body: m.body ?? "", isStopKeyword: m.isStopKeyword ?? false, timeAgo: timeAgo(m.createdAt) }));

  const hasMessages = unresolved.length + resolved.length > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#1E293B" }}>Inbox</h1>
          <p className="mt-1 text-sm" style={{ color: "#64748B" }}>
            Patient replies and inbound messages.
            {unresolved.length > 0 && (
              <span className="ml-2 font-medium" style={{ color: "#FF6B35" }}>
                {unresolved.length} need{unresolved.length === 1 ? "s" : ""} a reply
              </span>
            )}
          </p>
        </div>
      </div>

      {!hasMessages ? (
        <div className="rounded-xl border-2 border-dashed p-16 text-center" style={{ borderColor: "#E2E8F0" }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: "#FFF3EE" }}>
            <MessageSquare size={22} style={{ color: "#FF6B35" }} />
          </div>
          <p className="font-medium text-sm" style={{ color: "#1E293B" }}>No messages yet</p>
          <p className="text-sm mt-1" style={{ color: "#94A3B8" }}>Patient replies will appear here once workflows are active.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {unresolved.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#94A3B8" }}>
                Needs Reply ({unresolved.length})
              </p>
              <div className="space-y-3">
                {unresolved.map((msg) => (
                  <Card key={msg.id} padding="md">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0" style={{ background: "#FF6B35" }}>
                        {((msg.patientFirstName?.[0] ?? "") + (msg.patientLastName?.[0] ?? "")).toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm" style={{ color: "#1E293B" }}>
                            {[msg.patientFirstName, msg.patientLastName].filter(Boolean).join(" ") || "Unknown"}
                          </span>
                          {msg.channel === "sms" ? <Phone size={12} style={{ color: "#94A3B8" }} /> : <Mail size={12} style={{ color: "#94A3B8" }} />}
                          <span className="text-xs ml-auto" style={{ color: "#94A3B8" }}>{msg.timeAgo}</span>
                        </div>
                        <p className="text-sm mb-3" style={{ color: "#475569" }}>{msg.body}</p>
                        {msg.patientId && (
                          <InboxReplyForm patientId={msg.patientId} channel={msg.channel ?? "sms"} />
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {resolved.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#94A3B8" }}>
                Resolved ({resolved.length})
              </p>
              <div className="space-y-2">
                {resolved.map((msg) => (
                  <div key={msg.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "#F8FAFC" }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0" style={{ background: "#CBD5E1" }}>
                      {((msg.patientFirstName?.[0] ?? "") + (msg.patientLastName?.[0] ?? "")).toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium" style={{ color: "#475569" }}>
                        {[msg.patientFirstName, msg.patientLastName].filter(Boolean).join(" ") || "Unknown"}
                      </span>
                      <p className="text-xs truncate" style={{ color: "#94A3B8" }}>{msg.body}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {msg.isStopKeyword && <Badge variant="danger">STOP</Badge>}
                      <span className="text-xs" style={{ color: "#94A3B8" }}>{msg.timeAgo}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
