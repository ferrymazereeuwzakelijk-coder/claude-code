"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Dictionary } from "@/content/dictionaries";
import { href, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Mobile-only call to action that slides in once the visitor has scrolled
 * past the first screen. Hidden on the contact page and near the footer.
 */
export function StickyCta({ locale, dict }: { locale: Locale; dict: Dictionary["stickyCta"] }) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const onContact = pathname?.startsWith(href(locale, "/contact"));

  useEffect(() => {
    if (onContact) return;
    const onScroll = () => {
      const doc = document.documentElement;
      const nearEnd = window.scrollY + window.innerHeight > doc.scrollHeight - 900;
      setVisible(window.scrollY > window.innerHeight * 0.8 && !nearEnd);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [onContact]);

  if (onContact) return null;

  return (
    <div
      aria-hidden={!visible}
      inert={!visible}
      className={cn(
        "fixed inset-x-3 bottom-3 z-40 flex items-center justify-between gap-3 rounded-full border border-line-strong bg-ink/85 py-2 pl-5 pr-2 shadow-2xl backdrop-blur-xl transition-[transform,opacity] duration-500 md:hidden",
        "pb-[max(0.5rem,env(safe-area-inset-bottom))]",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-24 opacity-0",
      )}
    >
      <span className="text-sm text-fog">{dict.text}</span>
      <Button asChild size="sm" variant="accent">
        <Link href={href(locale, "/contact")}>{dict.button}</Link>
      </Button>
    </div>
  );
}
