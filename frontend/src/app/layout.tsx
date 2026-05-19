import type { Metadata } from "next";
import "./globals.css";
import { VisitTracker } from "../components/VisitTracker";
import { ThemeProvider } from "../components/ThemeProvider";
import { BottomNav } from "../components/BottomNav";
import { PWARegister } from "../components/PWARegister";

export const metadata: Metadata = {
  title: "EPH Platform — Emlak Portföy Havuzu",
  description: "Türkiye'nin kapalı devre B2B emlak ekosistemi.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <meta charSet="utf-8" />
        <meta name="theme-color" content="#0D2137" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="EPH" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Lora:wght@400;500&family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ThemeProvider>
          <VisitTracker />
          <PWARegister />
          {children}
          <BottomNav />
        </ThemeProvider>
      </body>
    </html>
  );
}
