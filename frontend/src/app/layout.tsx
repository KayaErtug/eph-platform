import type { Metadata } from "next";
import "./globals.css";
import { VisitTracker } from "../components/VisitTracker";

export const metadata: Metadata = {
  title: "EPH Platform — Emlak Portföy Havuzu",
  description: "Türkiye'nin kapalı devre B2B emlak ekosistemi.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <head><meta charSet="utf-8" /></head>
      <body>
        <VisitTracker />
        {children}
      </body>
    </html>
  );
}
