"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const HEARTBEAT_INTERVAL_MS = 60 * 1000;
const MIN_LOG_GAP_MS = 20 * 1000;

export function VisitTracker() {
  const pathname = usePathname();
  const lastSentAtRef = useRef<number>(0);
  const pathnameRef = useRef<string | null>(null);

  useEffect(() => {
    pathnameRef.current = pathname || null;
  }, [pathname]);

  useEffect(() => {
    if (!pathname) return;

    const sendVisitLog = (force = false) => {
      const token = localStorage.getItem("token");
      const currentPath = pathnameRef.current;

      if (!token || !currentPath) return;

      const now = Date.now();

      if (!force && now - lastSentAtRef.current < MIN_LOG_GAP_MS) {
        return;
      }

      lastSentAtRef.current = now;

      fetch("/api/visit-log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ page: currentPath }),
        keepalive: true,
      }).catch(() => {
        // Ziyaret kaydı çalışmazsa kullanıcı deneyimini bozma.
      });
    };

    sendVisitLog(true);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        sendVisitLog(false);
      }
    }, HEARTBEAT_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        sendVisitLog(true);
      }
    };

    const handleFocus = () => {
      sendVisitLog(true);
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [pathname]);

  return null;
}