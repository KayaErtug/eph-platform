"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";

type NavItem = {
  href: string;
  svg: string;
  label: string;
};

const SVG = {
  home: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  portfolio:
    "M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6M9 10h.01M15 10h.01",
  crm:
    "M9 5h6M9 9h6M9 13h3M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z",
  forum:
    "M21 15a4 4 0 01-4 4H8l-5 3V7a4 4 0 014-4h10a4 4 0 014 4v8zM8 9h8M8 13h5",
  ai:
    "M12 3c1.657 0 3 1.343 3 3v1h1a3 3 0 013 3v4a3 3 0 01-3 3h-1v1a3 3 0 01-6 0v-1H8a3 3 0 01-3-3v-4a3 3 0 013-3h1V6c0-1.657 1.343-3 3-3zM9 12h.01M15 12h.01M10 15h4",
};

const MENU_ITEMS: NavItem[] = [
  { href: "/dashboard", svg: SVG.home, label: "Ana Sayfa" },
  { href: "/stok", svg: SVG.portfolio, label: "Portföy" },
  { href: "/crm", svg: SVG.crm, label: "CRM" },
  { href: "/network", svg: SVG.forum, label: "Talep Merkezi" },
  { href: "/lina", svg: SVG.ai, label: "Yapay Zeka" },
];

function normalizeRole(role?: string | null) {
  return String(role || "")
    .toLocaleUpperCase("tr-TR")
    .trim();
}

function isContractorRole(role?: string | null) {
  const normalizedRole = normalizeRole(role);

  return (
    normalizedRole === "MUTEAHHIT" ||
    normalizedRole === "MÜTEAHHİT" ||
    normalizedRole === "MÜTAHHİT" ||
    normalizedRole === "INSAAT_FIRMASI" ||
    normalizedRole === "İNŞAAT_FİRMASI"
  );
}

function getRoleTheme(role?: string | null) {
  if (isContractorRole(role)) {
    return {
      active: "#EA580C",
      passive: "#9CA3AF",
      dot: "#EA580C",
      soft: "#FFF7ED",
    };
  }

  return {
    active: "#1557D6",
    passive: "#9CA3AF",
    dot: "#1557D6",
    soft: "#EFF6FF",
  };
}

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();
  const [isMobile, setIsMobile] = useState(false);

  const theme = getRoleTheme(user?.role);

  const items = useMemo(() => {
    return MENU_ITEMS;
  }, []);

  useEffect(() => {
    const updateDevice = () => {
      setIsMobile(window.innerWidth < 768);
    };

    updateDevice();
    window.addEventListener("resize", updateDevice);

    return () => {
      window.removeEventListener("resize", updateDevice);
    };
  }, []);

  if (!pathname || ["/", "/giris", "/kayit"].includes(pathname)) {
    return null;
  }

  if (!isMobile) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "#FFFFFF",
        borderTop: "1px solid #DDE7F3",
        minHeight: 72,
        display: "grid",
        gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
        alignItems: "center",
        paddingBottom: "max(7px, env(safe-area-inset-bottom))",
        paddingTop: 6,
        paddingLeft: 5,
        paddingRight: 5,
        boxShadow: "0 -14px 34px rgba(15, 23, 42, 0.10)",
      }}
    >
      {items.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);

        return (
          <button
            key={item.href}
            type="button"
            onClick={() => router.push(item.href)}
            style={{
              display: "flex",
              minWidth: 0,
              minHeight: 58,
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              border: "none",
              cursor: "pointer",
              background: active ? theme.soft : "transparent",
              borderRadius: 18,
              padding: "7px 2px",
              WebkitTapHighlightColor: "transparent",
              transition: "all 0.2s ease",
            }}
          >
            <svg
              width="23"
              height="23"
              viewBox="0 0 24 24"
              fill="none"
              stroke={active ? theme.active : theme.passive}
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d={item.svg} />
            </svg>

            <span
              style={{
                width: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontSize: item.label === "Yapay Zeka" ? 9.4 : 10,
                lineHeight: "12px",
                letterSpacing: 0.05,
                color: active ? theme.active : theme.passive,
                fontWeight: active ? 900 : 700,
                whiteSpace: "nowrap",
                textAlign: "center",
              }}
            >
              {item.label}
            </span>

            <div
              style={{
                width: active ? 5 : 0,
                height: active ? 5 : 0,
                borderRadius: "999px",
                background: theme.dot,
                marginTop: 1,
                transition: "all 0.2s ease",
              }}
            />
          </button>
        );
      })}
    </div>
  );
}