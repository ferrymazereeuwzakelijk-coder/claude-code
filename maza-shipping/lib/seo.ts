import type { Metadata } from "next";
import { getDictionary } from "@/content/dictionaries";
import { defaultLocale, href, localeTags, locales, type Locale, type RouteKey } from "@/content/i18n";
import { SITE_URL, ogImage, company } from "@/content/site";

type MetaKey = Exclude<keyof ReturnType<typeof getDictionary>["meta"], "siteName">;

export function pageMetadata(locale: Locale, route: RouteKey, key: MetaKey, image?: string): Metadata {
  const t = getDictionary(locale).meta;
  const { title, description } = t[key];
  const url = `${SITE_URL}${href(locale, route)}`;
  const languages = Object.fromEntries(locales.map((l) => [l, `${SITE_URL}${href(l, route)}`]));
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url, languages: { ...languages, "x-default": `${SITE_URL}${href(defaultLocale, route)}` } },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      siteName: t.siteName,
      locale: localeTags[locale].og,
      alternateLocale: locales.filter((l) => l !== locale).map((l) => localeTags[l].og),
      images: [{ url: image ?? ogImage, width: 1200, height: 630, alt: company.name }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image ?? ogImage] },
  };
}
