import type { Metadata } from "next";
import "./globals.css";
import { VisitTracker } from "../components/VisitTracker";
import { ThemeProvider } from "../components/ThemeProvider";
import { PWARegister } from "../components/PWARegister";
import { EPHMobileShell } from "../components/EPHMobileShell";

export const metadata: Metadata = {
  title: "EPH Platform — Emlak Portföy Havuzu",
  description: "Türkiye'nin kapalı devre B2B emlak ekosistemi.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <meta charSet="utf-8" />
        <meta name="theme-color" content="#F8FAFC" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="EPH" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body>
        <ThemeProvider>
          <VisitTracker />
          <PWARegister />
          <EPHMobileShell>{children}</EPHMobileShell>
        </ThemeProvider>
      </body>
    </html>
  );
}