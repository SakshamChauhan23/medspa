"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Zap } from "lucide-react";

interface Props {
  plan: "starter" | "standard";
  isUpgrade?: boolean;
}

export function CheckoutButton({ plan, isUpgrade }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Failed to start checkout.");
      }
    } catch {
      alert("Failed to start checkout.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      className="w-full"
      loading={loading}
      onClick={handleClick}
      variant={isUpgrade ? "primary" : "primary"}
    >
      {isUpgrade ? (
        <>
          <Zap size={14} /> Upgrade to Standard
        </>
      ) : (
        "Get Started"
      )}
    </Button>
  );
}
