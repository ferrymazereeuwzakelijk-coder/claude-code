import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import "../globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RevealObserver from "@/components/RevealObserver";
import JsonLd from "@/components/JsonLd";
import { getDictionary } from "@/content/dictionaries";
import { isLocale, locales, href } from "@/content/i18n";
import { SITE_URL, company, ogImage } from "@/content/site";

// Archivo's width axis gives the wide, heavy display style of the wordmark
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-jetbrains", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const dynamicParams = false;
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: company.name,
  authors: [{ name: company.name }],
  formatDetection: { telephone: true, email: true, address: true },
};

export const viewport: Viewport = { themeColor: "#07090b", width: "device-width", initialScale: 1 };

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);

  const org = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_URL}/#organization`,
    name: company.name,
    url: `${SITE_URL}${href(locale, "home")}`,
    image: ogImage,
    telephone: "+31652638368",
    email: company.email,
    description: t.meta.home.description,
    address: {
      "@type": "PostalAddress",
      streetAddress: company.address.street,
      postalCode: company.address.postalCode,
      addressLocality: company.address.city,
      addressCountry: company.address.country,
    },
    geo: { "@type": "GeoCoordinates", latitude: company.geo.lat, longitude: company.geo.lng },
    areaServed: { "@type": "Country", name: "Netherlands" },
    employee: { "@type": "Person", name: company.contactPerson },
    knowsLanguage: [...locales],
  };

  return (
    <html lang={locale} className={`${archivo.variable} ${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        {/* Enables scroll-reveal styles only when JS runs (content stays visible without JS) */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <Header locale={locale} nav={t.nav} />
        <main id="main">{children}</main>
        <Footer locale={locale} t={t} />
        <RevealObserver />
        <JsonLd data={org} />
      </body>
    </html>
  );
}
