import Link from "next/link";
import { site } from "@/content/site";
import { href, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={cn("size-8", className)}>
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4B7BFF" />
          <stop offset="1" stopColor="#8066FF" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="62" height="62" rx="15" fill="none" stroke="rgb(255 255 255 / 0.14)" strokeWidth="2" />
      <path
        d="M16 45V19l16 16 16-16v26"
        fill="none"
        stroke="url(#logo-g)"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ locale, className }: { locale: Locale; className?: string }) {
  return (
    <Link
      href={href(locale)}
      className={cn("flex items-center gap-3 font-display text-[0.95rem] font-semibold tracking-[-0.01em] text-white", className)}
      aria-label={`${site.brandName} home`}
    >
      <LogoMark />
      <span>{site.brandName}</span>
    </Link>
  );
}
