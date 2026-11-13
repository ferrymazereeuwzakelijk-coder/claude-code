import type { MetadataRoute } from "next";
import { SITE_URL } from "@/content/site";
import { href, locales, routes, type RouteKey } from "@/content/i18n";

const priority: Record<RouteKey, number> = { home: 1, tugboat: 0.9, brokerage: 0.9, contact: 0.8, about: 0.7, privacy: 0.2 };

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return (Object.keys(routes) as RouteKey[]).flatMap((r) =>
    locales.map((l) => ({
      url: `${SITE_URL}${href(l, r)}`,
      lastModified: now,
      changeFrequency: r === "privacy" ? ("yearly" as const) : ("monthly" as const),
      priority: priority[r],
      alternates: { languages: Object.fromEntries(locales.map((x) => [x, `${SITE_URL}${href(x, r)}`])) },
    })),
  );
}
