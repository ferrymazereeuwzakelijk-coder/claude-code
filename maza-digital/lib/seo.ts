import type { Metadata } from "next";
import { site } from "@/content/site";
import { locales, type Locale } from "./i18n";

/** Build page metadata with canonical URL, hreflang alternates and Open Graph. */
export function pageMetadata({
  locale,
  path,
  title,
  description,
}: {
  locale: Locale;
  /** Path without locale, e.g. "/services/websites". Use "" for home. */
  path: string;
  title: string;
  description: string;
}): Metadata {
  const languages = Object.fromEntries(locales.map((l) => [l === "nl" ? "nl-NL" : "en", `${site.url}/${l}${path}`]));
  const url = `${site.url}/${locale}${path}`;
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: { ...languages, "x-default": `${site.url}/nl${path}` },
    },
    openGraph: {
      type: "website",
      url,
      title: `${title} | ${site.brandName}`,
      description,
      siteName: site.brandName,
      locale: locale === "nl" ? "nl_NL" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${site.brandName}`,
      description,
    },
  };
}
