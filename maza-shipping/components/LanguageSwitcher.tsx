"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales, type Locale } from "@/content/i18n";

type Props = { locale: Locale; label: string; className?: string };

export default function LanguageSwitcher({ locale, label, className = "" }: Props) {
  const pathname = usePathname() || `/${locale}`;
  const rest = pathname.replace(/^\/(en|nl)(?=\/|$)/, "");
  return (
    <nav aria-label={label} className={`flex items-center gap-1 text-[0.78rem] font-bold tracking-[0.12em] ${className}`}>
      {locales.map((l, i) => (
        <span key={l} className="flex items-center gap-1">
          {i > 0 && <span aria-hidden className="opacity-30">/</span>}
          <Link
            href={`/${l}${rest}`}
            hrefLang={l}
            lang={l}
            aria-current={l === locale ? "true" : undefined}
            className={`rounded px-1.5 py-1 uppercase transition-opacity ${l === locale ? "opacity-100" : "opacity-50 hover:opacity-100"}`}
          >
            {l}
          </Link>
        </span>
      ))}
    </nav>
  );
}
