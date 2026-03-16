"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Send } from "lucide-react";

interface Props { patientId: string; channel: string; }

export function InboxReplyForm({ patientId, channel }: Props) {
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    if (!body.trim()) return;
    setLoading(true);
    try {
      await fetch(`/api/messages/thread/${patientId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, channel }),
      });
      setSent(true);
      setBody("");
    } catch {
      alert("Failed to send reply.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return <p className="text-xs font-medium" style={{ color: "#14B8A6" }}>✓ Reply sent</p>;
  }

  return (
    <div className="flex gap-2">
      <input
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={`Reply via ${channel}…`}
        className="flex-1 px-3 py-1.5 text-sm rounded-lg border outline-none"
        style={{ borderColor: "#E2E8F0", color: "#1E293B" }}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
      />
      <Button size="sm" loading={loading} onClick={handleSend} disabled={!body.trim()}>
        <Send size={13} /> Send
      </Button>
    </div>
  );
}
