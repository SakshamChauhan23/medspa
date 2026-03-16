import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function GlobalNotFound() {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen text-center px-4"
      style={{ background: "#FFFBF5" }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-white font-bold text-2xl"
        style={{ background: "#FF6B35" }}
      >
        404
      </div>
      <h1 className="text-2xl font-bold mb-2" style={{ color: "#1E293B" }}>
        Page not found
      </h1>
      <p className="text-sm mb-8" style={{ color: "#64748B" }}>
        This page doesn't exist.
      </p>
      <Link href="/">
        <Button>Go home</Button>
      </Link>
    </div>
  );
}
