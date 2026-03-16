import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, patients, users } from "@/lib/db";
import { eq, and, ilike, or, desc, count, sql } from "drizzle-orm";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Users, Search } from "lucide-react";
import Link from "next/link";

interface SearchParams { page?: string; search?: string; }

async function getClinicId(userId: string) {
  const [user] = await db.select({ clinicId: users.clinicId }).from(users).where(eq(users.clerkUserId, userId)).limit(1);
  return user?.clinicId ?? null;
}

async function getPatients(clinicId: string, page: number, search: string | undefined) {
  const limit = 25;
  const offset = (page - 1) * limit;
  const where = search?.trim()
    ? and(eq(patients.clinicId, clinicId), or(ilike(patients.firstName, `%${search}%`), ilike(patients.lastName, `%${search}%`), ilike(patients.email, `%${search}%`), ilike(patients.phone, `%${search}%`)))
    : eq(patients.clinicId, clinicId);

  const [rows, [{ total }]] = await Promise.all([
    db.select({
      id: patients.id, firstName: patients.firstName, lastName: patients.lastName,
      email: patients.email, phone: patients.phone,
      smsOptOut: patients.smsOptOut, emailOptOut: patients.emailOptOut,
      lastAppointment: sql<string>`(SELECT MAX(appointment_date)::text FROM appointments a WHERE a.patient_id = ${patients.id} AND a.clinic_id = ${clinicId})`,
      treatmentCount: sql<number>`(SELECT COUNT(*)::int FROM treatments t WHERE t.patient_id = ${patients.id} AND t.clinic_id = ${clinicId})`,
    }).from(patients).where(where).orderBy(desc(patients.createdAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(patients).where(where),
  ]);

  return { rows, total: Number(total), page, totalPages: Math.ceil(Number(total) / limit) };
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getInitials(f: string | null, l: string | null) {
  return ((f?.[0] ?? "") + (l?.[0] ?? "")).toUpperCase() || "?";
}

export default async function PatientsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const clinicId = await getClinicId(userId);
  if (!clinicId) redirect("/dashboard");

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const search = params.search ?? undefined;
  const { rows, total, totalPages } = await getPatients(clinicId, page, search);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#1E293B" }}>Patients</h1>
          <p className="mt-1 text-sm" style={{ color: "#64748B" }}>{total.toLocaleString()} patient{total !== 1 ? "s" : ""} synced</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-5">
        <form method="GET">
          <div className="relative max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#94A3B8" }} />
            <input
              name="search"
              defaultValue={search}
              placeholder="Search by name, email, or phone…"
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border outline-none"
              style={{ borderColor: "#E2E8F0", background: "#FFFFFF", color: "#1E293B" }}
            />
          </div>
        </form>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed p-16 text-center" style={{ borderColor: "#E2E8F0" }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: "#FFF3EE" }}>
            <Users size={22} style={{ color: "#FF6B35" }} />
          </div>
          <p className="font-medium text-sm mb-1" style={{ color: "#1E293B" }}>{search ? "No patients match your search" : "No patients yet"}</p>
          <p className="text-sm" style={{ color: "#94A3B8" }}>{search ? "Try a different name, email, or phone number." : "Connect Aesthetic Record to sync your patient database."}</p>
          {!search && (
            <Link href="/integrations" className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: "#FF6B35" }}>
              Connect PMS
            </Link>
          )}
        </div>
      ) : (
        <Card padding="sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #E2E8F0" }}>
                  {["Patient", "Phone", "Email", "Last Appointment", "Treatments", "Status"].map((col) => (
                    <th key={col} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "#94A3B8" }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((p, i) => (
                  <tr key={p.id} className="group hover:bg-slate-50 transition-colors" style={{ borderBottom: i < rows.length - 1 ? "1px solid #F1F5F9" : "none" }}>
                    <td className="px-4 py-3">
                      <Link href={`/patients/${p.id}`} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0" style={{ background: "#FF6B35" }}>
                          {getInitials(p.firstName, p.lastName)}
                        </div>
                        <span className="font-medium group-hover:underline" style={{ color: "#1E293B" }}>
                          {[p.firstName, p.lastName].filter(Boolean).join(" ") || "Unknown"}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3" style={{ color: "#475569" }}>{p.phone ?? "—"}</td>
                    <td className="px-4 py-3" style={{ color: "#475569" }}>{p.email ?? "—"}</td>
                    <td className="px-4 py-3" style={{ color: "#475569" }}>{formatDate(p.lastAppointment)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold" style={{ background: "#FFF3EE", color: "#FF6B35" }}>
                        {p.treatmentCount}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {p.smsOptOut   && <Badge variant="danger">SMS off</Badge>}
                        {p.emailOptOut && <Badge variant="warning">Email off</Badge>}
                        {!p.smsOptOut && !p.emailOptOut && <Badge variant="success">Active</Badge>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 pt-4 mt-2 border-t" style={{ borderColor: "#F1F5F9" }}>
              <p className="text-xs" style={{ color: "#94A3B8" }}>Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link href={`/patients?page=${page - 1}${search ? `&search=${search}` : ""}`} className="px-3 py-1.5 text-xs rounded-lg border font-medium" style={{ borderColor: "#E2E8F0", color: "#475569" }}>Previous</Link>
                )}
                {page < totalPages && (
                  <Link href={`/patients?page=${page + 1}${search ? `&search=${search}` : ""}`} className="px-3 py-1.5 text-xs rounded-lg text-white font-medium" style={{ background: "#FF6B35" }}>Next</Link>
                )}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
