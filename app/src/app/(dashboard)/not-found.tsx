import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: "#F0FDFA" }}
      >
        <SearchX size={24} style={{ color: "#14B8A6" }} />
      </div>
      <h2 className="text-xl font-bold mb-2" style={{ color: "#1E293B" }}>
        Page not found
      </h2>
      <p className="text-sm mb-6" style={{ color: "#64748B" }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link href="/dashboard">
        <Button>Back to Dashboard</Button>
      </Link>
    </div>
  );
}
