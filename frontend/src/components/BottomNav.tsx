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
  listings:
    "M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6M9 10h.01M15 10h.01",
  customers:
    "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  marketplace:
    "M4 7h16M4 7l1.4 13h13.2L20 7M7 7l2-4h6l2 4M9 12h6",
  lina:
    "M12 3c1.657 0 3 1.343 3 3v1h1a3 3 0 013 3v4a3 3 0 01-3 3h-1v1a3 3 0 01-6 0v-1H8a3 3 0 01-3-3v-4a3 3 0 013-3h1V6c0-1.657 1.343-3 3-3zM9 12h.01M15 12h.01M10 15h4",
};

const REALTOR_ITEMS: NavItem[] = [
  { href: "/dashboard", svg: SVG.home, label: "Ana Sayfa" },
  { href: "/stok", svg: SVG.listings, label: "İlanlarım" },
  { href: "/crm", svg: SVG.customers, label: "Müşterilerim" },
  { href: "/network", svg: SVG.marketplace, label: "Pazaryeri" },
  { href: "/lina", svg: SVG.lina, label: "Lina" },
];

const CONTRACTOR_ITEMS: NavItem[] = [
  { href: "/dashboard", svg: SVG.home, label: "Ana Sayfa" },
  { href: "/stok", svg: SVG.listings, label: "Projelerim" },
  { href: "/crm", svg: SVG.customers, label: "İş Ortaklarım" },
  { href: "/network", svg: SVG.marketplace, label: "Pazaryeri" },
  { href: "/lina", svg: SVG.lina, label: "Lina" },
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
    };
  }

  return {
    active: "#2563EB",
    passive: "#9CA3AF",
    dot: "#2563EB",
  };
}

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();
  const [isMobile, setIsMobile] = useState(false);

  const theme = getRoleTheme(user?.role);

  const items = useMemo(() => {
    if (isContractorRole(user?.role)) {
      return CONTRACTOR_ITEMS;
    }

    return REALTOR_ITEMS;
  }, [user?.role]);

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
        borderTop: "1px solid #E5E7EB",
        minHeight: 68,
        display: "grid",
        gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
        alignItems: "center",
        paddingBottom: "max(6px, env(safe-area-inset-bottom))",
        paddingLeft: 4,
        paddingRight: 4,
        boxShadow: "0 -12px 30px rgba(15, 23, 42, 0.08)",
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
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              border: "none",
              cursor: "pointer",
              background: "transparent",
              padding: "6px 2px",
              WebkitTapHighlightColor: "transparent",
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
                fontSize: 10,
                lineHeight: "12px",
                letterSpacing: 0.1,
                color: active ? theme.active : theme.passive,
                fontWeight: active ? 800 : 600,
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