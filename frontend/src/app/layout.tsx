import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EPH - Emlak Portfoy Havuzu',
  description: 'Kapali devre profesyonel emlak agi',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" translate="no">
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body>{children}</body>
    </html>
  );
}