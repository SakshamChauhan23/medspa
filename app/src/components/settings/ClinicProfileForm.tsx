"use client";

import { useState } from "react";

interface Props {
  clinicId: string;
  name: string;
  email: string;
  phone: string | null;
  timezone: string | null;
}

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
];

export function ClinicProfileForm({ clinicId, name, email, phone, timezone }: Props) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      phone: (form.elements.namedItem("phone") as HTMLInputElement).value,
      timezone: (form.elements.namedItem("timezone") as HTMLSelectElement).value,
    };

    try {
      const res = await fetch(`/api/settings/clinic`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "#64748B" }}>Clinic Name</label>
          <input
            name="name"
            defaultValue={name}
            required
            className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
            style={{ borderColor: "#E2E8F0", color: "#1E293B" }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "#64748B" }}>Email</label>
          <input
            name="email"
            defaultValue={email}
            disabled
            className="w-full px-3 py-2 text-sm rounded-lg border"
            style={{ borderColor: "#E2E8F0", color: "#94A3B8", background: "#F8FAFC" }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "#64748B" }}>Phone</label>
          <input
            name="phone"
            defaultValue={phone ?? ""}
            className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
            style={{ borderColor: "#E2E8F0", color: "#1E293B" }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "#64748B" }}>Timezone</label>
          <select
            name="timezone"
            defaultValue={timezone ?? "America/New_York"}
            className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
            style={{ borderColor: "#E2E8F0", color: "#1E293B" }}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz.replace("_", " ")}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 text-sm font-medium rounded-lg text-white"
          style={{ background: saving ? "#94A3B8" : "#FF6B35" }}
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
        {saved && <span className="text-sm" style={{ color: "#14B8A6" }}>Saved</span>}
        {error && <span className="text-sm" style={{ color: "#EF4444" }}>{error}</span>}
      </div>
    </form>
  );
}
