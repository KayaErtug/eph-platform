"use client";

import { useRouter } from "next/navigation";
import LinaPanel from "@/components/LinaPanel";

export const dynamic = "force-dynamic";

export default function LinaPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#F4F7FB]">
      <LinaPanel open onClose={() => router.push("/dashboard")} />
    </main>
  );
}