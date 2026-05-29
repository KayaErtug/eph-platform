"use client";

import { useRouter } from "next/navigation";
import EphAppShell from "@/components/EphAppShell";
import LinaPanel from "@/components/LinaPanel";

export default function LinaPage() {
  const router = useRouter();

  return (
    <EphAppShell title="Lina">
      <div className="mx-auto w-full max-w-5xl pb-6">
        <LinaPanel open onClose={() => router.push("/dashboard")} />
      </div>
    </EphAppShell>
  );
}