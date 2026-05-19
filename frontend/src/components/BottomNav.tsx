"use client";
import { usePathname, useRouter } from "next/navigation";

const ITEMS = [
  { href: "/dashboard", svg: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6", label: "Anasayfa" },
  { href: "/stok",      svg: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4", label: "Stok" },
  { href: "/crm",       svg: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", label: "CRM" },
  { href: "/market",    svg: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", label: "Piyasa" },
  { href: "/profil",    svg: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z", label: "Profil" },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  if (!pathname || ["/", "/giris", "/kayit"].includes(pathname)) return null;

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999,
      background: "#fff", borderTop: "0.5px solid #E2DDD5",
      height: 65, display: "flex", alignItems: "center",
      justifyContent: "space-around", paddingBottom: 4,
    }}>
      {ITEMS.map(item => {
        const active = pathname.startsWith(item.href);
        return (
          <button key={item.href} onClick={() => router.push(item.href)}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: 3, border: "none", cursor: "pointer",
              background: "none", padding: "4px 8px", minWidth: 56,
            }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke={active ? "#B8943F" : "#AEAEB2"} strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round">
              <path d={item.svg} />
            </svg>
            <span style={{
              fontSize: 9, letterSpacing: 0.5, textTransform: "uppercase",
              color: active ? "#B8943F" : "#AEAEB2",
              fontWeight: active ? 700 : 400,
            }}>{item.label}</span>
            {active && <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#B8943F", marginTop: 1 }} />}
          </button>
        );
      })}
    </div>
  );
}
