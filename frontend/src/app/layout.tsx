import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EPH Platform — Emlak Portföy Havuzu",
  description: "Türkiye'nin kapalı devre B2B emlak ekosistemi. Emlakçı, müteahhit ve inşaat firmalarının bir arada çalıştığı profesyonel ağ.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}