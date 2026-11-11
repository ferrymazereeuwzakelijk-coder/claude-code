export const locales = ["nl", "en", "de"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "nl";

/** BCP 47 tags (dates, numbers) and Open Graph locale codes per language. */
export const localeTags: Record<Locale, { bcp47: string; og: string }> = {
  nl: { bcp47: "nl-NL", og: "nl_NL" },
  en: { bcp47: "en-GB", og: "en_GB" },
  de: { bcp47: "de-DE", og: "de_DE" },
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Route keys → path (same slugs for both languages, prefixed by locale). */
export const routes = {
  home: "",
  tugboat: "/tugboat-services",
  brokerage: "/maritime-brokerage",
  about: "/about",
  contact: "/contact",
  privacy: "/privacy",
} as const;
export type RouteKey = keyof typeof routes;

export function href(locale: Locale, route: RouteKey, hash?: string) {
  return `/${locale}${routes[route]}${hash ? `#${hash}` : ""}`;
}
