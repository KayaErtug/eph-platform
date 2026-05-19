"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function useVisitLogger() {
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("/api/visit-log", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ page: pathname }),
    }).catch(() => {});
  }, [pathname]);
}
