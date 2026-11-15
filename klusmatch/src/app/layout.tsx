import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'KlusMatch — Je klus geregeld via WhatsApp', template: '%s · KlusMatch' },
  description: 'Stuur een foto van je klus via WhatsApp. Onze AI maakt er een duidelijke opdracht van en geverifieerde vakmensen in jouw regio sturen een offerte.',
};

export const viewport: Viewport = { themeColor: '#0B1B33', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap"
        />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
