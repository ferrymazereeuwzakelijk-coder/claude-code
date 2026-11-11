"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales, switchLocalePath, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ locale, label, className }: { locale: Locale; label: string; className?: string }) {
  const pathname = usePathname() || `/${locale}`;
  return (
    <nav aria-label={label} className={cn("flex items-center rounded-full border border-line p-0.5 text-xs", className)}>
      {locales.map((l) => (
        <Link
          key={l}
          href={switchLocalePath(pathname, l)}
          hrefLang={l}
          lang={l}
          aria-current={l === locale ? "true" : undefined}
          className={cn(
            "rounded-full px-2.5 py-1 font-medium uppercase transition-colors",
            l === locale ? "bg-white/10 text-white" : "text-mist hover:text-white",
          )}
        >
          {l}
        </Link>
      ))}
    </nav>
  );
}
