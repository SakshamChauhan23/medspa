"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Zap } from "lucide-react";

export function TriggerScanButton() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleTrigger() {
    setLoading(true);
    try {
      await fetch("/api/automations/trigger", { method: "POST" });
      setDone(true);
      setTimeout(() => setDone(false), 4000);
    } catch {
      alert("Failed to trigger scan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="sm" loading={loading} onClick={handleTrigger}>
      <Zap size={14} />
      {done ? "Scan queued!" : "Run Trigger Scan"}
    </Button>
  );
}
