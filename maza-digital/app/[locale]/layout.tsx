import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { notFound } from "next/navigation";
import { getDictionary } from "@/content/dictionaries";
import { site } from "@/content/site";
import { isLocale, locales } from "@/lib/i18n";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { StickyCta } from "@/components/layout/sticky-cta";
import "../globals.css";

const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk", display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: "#080B12",
  colorScheme: "dark",
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    metadataBase: new URL(site.url),
    title: { default: `${site.brandName} | ${dict.meta.homeTitle}`, template: `%s | ${site.brandName}` },
    description: dict.meta.homeDescription,
    applicationName: site.brandName,
    authors: [{ name: site.founder }],
    creator: site.founder,
    formatDetection: { telephone: false },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  // Structured data with facts only — no ratings, reviews or invented figures.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: site.brandName,
    url: `${site.url}/${locale}`,
    email: site.email,
    founder: { "@type": "Person", name: site.founder },
    areaServed: "Worldwide",
    address: { "@type": "PostalAddress", addressCountry: "NL" },
    knowsLanguage: ["nl", "en"],
  };

  return (
    <html lang={locale} className={`${display.variable} ${sans.variable}`}>
      <body>
        <Header locale={locale} dict={dict.nav} />
        <main id="main">{children}</main>
        <Footer locale={locale} dict={dict} />
        <StickyCta locale={locale} dict={dict.stickyCta} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </body>
    </html>
  );
}
