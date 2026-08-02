import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { VisitTracker } from "../components/VisitTracker";
import { ThemeProvider } from "../components/ThemeProvider";
import { PWARegister } from "../components/PWARegister";
import { EPHMobileShell } from "../components/EPHMobileShell";
import EPHCoordinationDock from "../components/coordination/EPHCoordinationDock";

const ORGANIZATION_MODULE_ENABLED = false;
const GOOGLE_ANALYTICS_ID = "G-RD345JKGLV";

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
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="EPH" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {!ORGANIZATION_MODULE_ENABLED && (
          <style>{`
            a[href="/admin/organization"],
            a[href^="/admin/organization/"] {
              display: none !important;
            }
          `}</style>
        )}
      </head>

      <body>
        <ThemeProvider>
          <VisitTracker />
          <PWARegister />
          <EPHMobileShell>{children}</EPHMobileShell>
          <EPHCoordinationDock />
        </ThemeProvider>
      </body>

      <GoogleAnalytics gaId={GOOGLE_ANALYTICS_ID} />
    </html>
  );
}
