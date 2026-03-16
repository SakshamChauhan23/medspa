"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { RefreshCw } from "lucide-react";

interface SyncButtonProps {
  integrationId: string;
  fullSync: boolean;
}

export function SyncButton({ integrationId, fullSync }: SyncButtonProps) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSync() {
    setLoading(true);
    setDone(false);
    try {
      await fetch("/api/integrations/aesthetic-record/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullSync }),
      });
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch {
      alert("Failed to trigger sync. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant={fullSync ? "secondary" : "primary"}
      size="sm"
      loading={loading}
      onClick={handleSync}
    >
      <RefreshCw size={13} />
      {done ? "Queued!" : fullSync ? "Full Sync" : "Sync Now"}
    </Button>
  );
}
