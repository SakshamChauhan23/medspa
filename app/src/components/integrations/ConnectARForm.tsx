"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ExternalLink, Eye, EyeOff } from "lucide-react";

export function ConnectARForm() {
  const [apiKey, setApiKey] = useState("");
  const [arClinicId, setArClinicId] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/integrations/aesthetic-record/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, arClinicId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Connection failed. Please check your credentials.");
        return;
      }

      // Reload the page to show connected state
      window.location.reload();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleConnect} className="space-y-4">
      <p className="text-sm" style={{ color: "#64748B" }}>
        Enter your Aesthetic Record API credentials to sync patient data.
      </p>

      {/* API Key */}
      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: "#1E293B" }}>
          API Key
        </label>
        <div className="relative">
          <input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-••••••••••••••••"
            required
            className="w-full pr-10 pl-3 py-2 text-sm rounded-lg border outline-none transition-all"
            style={{
              borderColor: "#E2E8F0",
              color: "#1E293B",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#FF6B35")}
            onBlur={(e) => (e.target.style.borderColor = "#E2E8F0")}
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: "#94A3B8" }}
          >
            {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      {/* AR Clinic ID */}
      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: "#1E293B" }}>
          Aesthetic Record Clinic ID
        </label>
        <input
          type="text"
          value={arClinicId}
          onChange={(e) => setArClinicId(e.target.value)}
          placeholder="clinic_abc123"
          required
          className="w-full px-3 py-2 text-sm rounded-lg border outline-none transition-all"
          style={{
            borderColor: "#E2E8F0",
            color: "#1E293B",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#FF6B35")}
          onBlur={(e) => (e.target.style.borderColor = "#E2E8F0")}
        />
        <p className="mt-1 text-xs" style={{ color: "#94A3B8" }}>
          Found in your Aesthetic Record settings under API Access.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div
          className="p-3 rounded-lg text-sm"
          style={{ background: "#FEF2F2", color: "#B91C1C", border: "1px solid #FECACA" }}
        >
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" loading={loading} disabled={!apiKey || !arClinicId}>
          Connect Aesthetic Record
        </Button>
        <a
          href="https://aestheticrecord.com/api-docs"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm"
          style={{ color: "#64748B" }}
        >
          <ExternalLink size={13} />
          Where to find these?
        </a>
      </div>
    </form>
  );
}
