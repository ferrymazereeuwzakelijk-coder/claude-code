export const locales = ["en", "nl"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

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
