// ─── Aesthetic Record API Response Types ─────────────────────────────────────
// These represent the raw shapes returned by the Aesthetic Record API.
// Shape is based on publicly documented AR API + common PMS data patterns.

export interface ARPatient {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null; // ISO date
  created_at: string;
  updated_at: string;
}

export interface ARTreatment {
  id: string;
  patient_id: string;
  treatment_type: string;
  treatment_date: string; // ISO date
  provider_name: string | null;
  notes: string | null;
}

export interface ARAppointment {
  id: string;
  patient_id: string;
  appointment_date: string; // ISO datetime
  treatment_type: string | null;
  status: "scheduled" | "confirmed" | "cancelled" | "no_show" | "completed";
  provider_name: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
}

export interface ARPaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    next_cursor?: string | null;
  };
}

export interface ARConnectionConfig {
  apiKey: string;
  clinicId: string; // AR's internal clinic ID
  baseUrl?: string;
}

export interface SyncResult {
  patientsUpserted: number;
  treatmentsUpserted: number;
  appointmentsUpserted: number;
  errors: string[];
  syncedAt: Date;
}
