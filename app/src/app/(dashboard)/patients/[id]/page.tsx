import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db, patients, treatments, appointments, optOuts, users } from "@/lib/db";
import { messages } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { OptOutToggle } from "@/components/patients/OptOutToggle";
import { InboxReplyForm } from "@/components/inbox/InboxReplyForm";
import {
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  Syringe,
  Clock,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";

async function getClinicId(userId: string): Promise<string | null> {
  const [user] = await db
    .select({ clinicId: users.clinicId })
    .from(users)
    .where(eq(users.clerkUserId, userId))
    .limit(1);
  return user?.clinicId ?? null;
}

function formatDate(d: Date | string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getAppointmentBadge(status: string) {
  switch (status) {
    case "completed":
      return <Badge variant="success">Completed</Badge>;
    case "confirmed":
      return <Badge variant="accent">Confirmed</Badge>;
    case "scheduled":
      return <Badge variant="default">Scheduled</Badge>;
    case "cancelled":
      return <Badge variant="danger">Cancelled</Badge>;
    case "no_show":
      return <Badge variant="warning">No Show</Badge>;
    default:
      return <Badge variant="muted">{status}</Badge>;
  }
}

function getInitials(firstName: string | null, lastName: string | null) {
  return ((firstName?.[0] ?? "") + (lastName?.[0] ?? "")).toUpperCase() || "?";
}

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const clinicId = await getClinicId(userId);
  if (!clinicId) redirect("/dashboard");

  const { id } = await params;

  const [patient] = await db
    .select()
    .from(patients)
    .where(and(eq(patients.id, id), eq(patients.clinicId, clinicId)))
    .limit(1);

  if (!patient) notFound();

  const [patientTreatments, patientAppointments, optOut, messageThread] = await Promise.all([
    db
      .select()
      .from(treatments)
      .where(and(eq(treatments.patientId, id), eq(treatments.clinicId, clinicId)))
      .orderBy(desc(treatments.treatmentDate)),

    db
      .select()
      .from(appointments)
      .where(and(eq(appointments.patientId, id), eq(appointments.clinicId, clinicId)))
      .orderBy(desc(appointments.appointmentDate)),

    db
      .select()
      .from(optOuts)
      .where(and(eq(optOuts.patientId, id), eq(optOuts.clinicId, clinicId)))
      .limit(1),

    db
      .select()
      .from(messages)
      .where(and(eq(messages.patientId, id), eq(messages.clinicId, clinicId)))
      .orderBy(desc(messages.createdAt))
      .limit(50),
  ]);

  const currentOptOut = optOut[0] ?? null;
  const upcomingAppointments = patientAppointments.filter(
    (a) =>
      new Date(a.appointmentDate) > new Date() && a.status === "scheduled"
  );
  const pastAppointments = patientAppointments.filter(
    (a) =>
      new Date(a.appointmentDate) <= new Date() || a.status !== "scheduled"
  );

  return (
    <div>
      {/* Back nav */}
      <Link
        href="/patients"
        className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors"
        style={{ color: "#64748B" }}
      >
        <ArrowLeft size={14} />
        Back to Patients
      </Link>

      {/* Patient header */}
      <div className="flex items-start gap-5 mb-8">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0"
          style={{ background: "#FF6B35" }}
        >
          {getInitials(patient.firstName, patient.lastName)}
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#1E293B" }}>
            {[patient.firstName, patient.lastName].filter(Boolean).join(" ") ||
              "Unknown Patient"}
          </h1>
          <div className="flex items-center gap-4 mt-1.5">
            {patient.phone && (
              <span
                className="flex items-center gap-1.5 text-sm"
                style={{ color: "#64748B" }}
              >
                <Phone size={13} />
                {patient.phone}
              </span>
            )}
            {patient.email && (
              <span
                className="flex items-center gap-1.5 text-sm"
                style={{ color: "#64748B" }}
              >
                <Mail size={13} />
                {patient.email}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            {patient.smsOptOut && <Badge variant="danger">SMS opted out</Badge>}
            {patient.emailOptOut && (
              <Badge variant="warning">Email opted out</Badge>
            )}
            {!patient.smsOptOut && !patient.emailOptOut && (
              <Badge variant="success">Receiving messages</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-1 space-y-5">
          {/* Patient info */}
          <Card>
            <CardHeader>
              <CardTitle>Patient Info</CardTitle>
            </CardHeader>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span style={{ color: "#94A3B8" }}>Name</span>
                <span style={{ color: "#1E293B" }}>
                  {[patient.firstName, patient.lastName]
                    .filter(Boolean)
                    .join(" ") || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "#94A3B8" }}>Phone</span>
                <span style={{ color: "#1E293B" }}>{patient.phone ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "#94A3B8" }}>Email</span>
                <span
                  className="truncate max-w-[160px]"
                  style={{ color: "#1E293B" }}
                >
                  {patient.email ?? "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "#94A3B8" }}>Date of Birth</span>
                <span style={{ color: "#1E293B" }}>
                  {patient.dateOfBirth ?? "—"}
                </span>
              </div>
            </div>
          </Card>

          {/* Communication settings */}
          <Card>
            <CardHeader>
              <CardTitle>Communication Settings</CardTitle>
            </CardHeader>
            <OptOutToggle
              patientId={patient.id}
              smsOptOut={currentOptOut?.smsOptOut ?? patient.smsOptOut ?? false}
              emailOptOut={
                currentOptOut?.emailOptOut ?? patient.emailOptOut ?? false
              }
            />
          </Card>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Upcoming appointments */}
          {upcomingAppointments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Appointments</CardTitle>
                <Badge variant="accent">{upcomingAppointments.length}</Badge>
              </CardHeader>
              <div className="space-y-2">
                {upcomingAppointments.map((appt) => (
                  <div
                    key={appt.id}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ background: "#F0FDFA" }}
                  >
                    <div className="flex items-center gap-2.5">
                      <Calendar size={15} style={{ color: "#14B8A6" }} />
                      <div>
                        <p className="text-sm font-medium" style={{ color: "#1E293B" }}>
                          {appt.treatmentType ?? "Appointment"}
                        </p>
                        <p className="text-xs" style={{ color: "#64748B" }}>
                          {formatDate(appt.appointmentDate)}
                        </p>
                      </div>
                    </div>
                    {getAppointmentBadge(appt.status ?? "scheduled")}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Treatment history */}
          <Card>
            <CardHeader>
              <CardTitle>Treatment History</CardTitle>
              <Badge variant="muted">{patientTreatments.length}</Badge>
            </CardHeader>
            {patientTreatments.length === 0 ? (
              <p className="text-sm" style={{ color: "#94A3B8" }}>
                No treatments on record.
              </p>
            ) : (
              <div className="space-y-2">
                {patientTreatments.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ background: "#F8FAFC" }}
                  >
                    <div className="flex items-center gap-2.5">
                      <Syringe size={14} style={{ color: "#FF6B35" }} />
                      <div>
                        <p className="text-sm font-medium" style={{ color: "#1E293B" }}>
                          {t.treatmentType}
                        </p>
                        <p className="text-xs" style={{ color: "#64748B" }}>
                          {formatDate(t.treatmentDate)} ·{" "}
                          {t.provider ?? "Provider not recorded"}
                        </p>
                      </div>
                    </div>
                    {t.cycleLengthDays && (
                      <span className="text-xs" style={{ color: "#94A3B8" }}>
                        Every {t.cycleLengthDays}d
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Message thread */}
          <Card>
            <CardHeader>
              <CardTitle>Message Thread</CardTitle>
              <Badge variant="muted">{messageThread.length}</Badge>
            </CardHeader>
            {messageThread.length === 0 ? (
              <p className="text-sm mb-4" style={{ color: "#94A3B8" }}>No messages yet.</p>
            ) : (
              <div className="space-y-2 mb-4 max-h-80 overflow-y-auto">
                {[...messageThread].reverse().map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className="max-w-[75%] px-3 py-2 rounded-xl text-sm"
                      style={{
                        background: msg.direction === "outbound" ? "#FF6B35" : "#F1F5F9",
                        color: msg.direction === "outbound" ? "#FFFFFF" : "#1E293B",
                      }}
                    >
                      <p>{msg.body}</p>
                      <p
                        className="text-xs mt-1 opacity-70"
                      >
                        {msg.channel.toUpperCase()} · {formatDate(msg.createdAt)}
                        {msg.isStopKeyword && " · STOP"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <InboxReplyForm patientId={id} channel="sms" />
          </Card>

          {/* Past appointments */}
          <Card>
            <CardHeader>
              <CardTitle>Appointment History</CardTitle>
              <Badge variant="muted">{pastAppointments.length}</Badge>
            </CardHeader>
            {pastAppointments.length === 0 ? (
              <p className="text-sm" style={{ color: "#94A3B8" }}>
                No appointment history.
              </p>
            ) : (
              <div className="space-y-2">
                {pastAppointments.slice(0, 10).map((appt) => (
                  <div
                    key={appt.id}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ background: "#F8FAFC" }}
                  >
                    <div className="flex items-center gap-2.5">
                      <Clock size={14} style={{ color: "#94A3B8" }} />
                      <div>
                        <p className="text-sm font-medium" style={{ color: "#1E293B" }}>
                          {appt.treatmentType ?? "Appointment"}
                        </p>
                        <p className="text-xs" style={{ color: "#64748B" }}>
                          {formatDate(appt.appointmentDate)}
                        </p>
                      </div>
                    </div>
                    {getAppointmentBadge(appt.status ?? "scheduled")}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
