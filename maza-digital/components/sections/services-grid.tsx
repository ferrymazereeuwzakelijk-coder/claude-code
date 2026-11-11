import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Dictionary } from "@/content/dictionaries";
import { homeServices } from "@/content/services";
import { href, t, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { SectionHeading } from "./section-heading";
import { ServiceVisual } from "./service-visual";

/**
 * Bento layout. Spans are tuned for the six homepage services in order:
 * websites, apps, software, ai, games, platforms.
 */
const layout = [
  "lg:col-span-7 lg:row-span-2",
  "lg:col-span-5 lg:row-span-2",
  "lg:col-span-4",
  "lg:col-span-4",
  "lg:col-span-4",
  "lg:col-span-12",
];

export function ServicesGrid({ locale, dict }: { locale: Locale; dict: Dictionary["services"] }) {
  return (
    <section id="services" aria-labelledby="services-title" className="scroll-mt-24 border-t border-line py-24 md:py-36">
      <div className="container-x">
        <SectionHeading id="services-title" title={dict.title} intro={dict.intro} />

        <ul className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-12">
          {homeServices.map((s, i) => {
            const wide = i === 5;
            const tall = i < 2;
            return (
              <li key={s.slug} className={cn(layout[i], wide && "md:col-span-2")}>
                <Link
                  href={href(locale, `/services/${s.slug}`)}
                  className={cn(
                    "group relative flex h-full flex-col overflow-hidden rounded-xl border border-line bg-ink-2 p-7 transition-colors duration-500 hover:border-line-strong md:p-9",
                    wide && "lg:flex-row lg:items-center lg:gap-12",
                  )}
                >
                  {/* Hover glow follows the card's accent */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-blue/20 opacity-0 blur-3xl transition-opacity duration-700 group-hover:opacity-100"
                  />

                  <div className={cn("relative", wide ? "lg:w-5/12" : "")}>
                    <div className="flex items-start justify-between gap-6">
                      <h3 className={cn("font-semibold tracking-[-0.03em]", tall ? "text-3xl md:text-4xl" : "text-2xl")}>
                        {t(s.title, locale)}
                      </h3>
                      <ArrowUpRight
                        aria-hidden
                        className="mt-1 size-5 shrink-0 text-mist transition-[transform,color] duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white"
                      />
                    </div>
                    <p className="mt-4 max-w-md text-[0.9375rem] leading-relaxed text-mist">{t(s.short, locale)}</p>
                    {tall && (
                      <ul className="mt-6 space-y-2 text-sm text-fog">
                        {t(s.useCases, locale).map((u) => (
                          <li key={u.title} className="flex gap-3">
                            <span aria-hidden className="mt-2 h-px w-3 shrink-0 bg-blue" />
                            {u.title}
                          </li>
                        ))}
                      </ul>
                    )}
                    <span className="sr-only">
                      {dict.more} {t(s.title, locale)}
                    </span>
                  </div>

                  <div
                    className={cn(
                      "relative mt-10",
                      tall && "mt-auto pt-12",
                      wide && "lg:mt-0 lg:flex-1",
                    )}
                  >
                    <ServiceVisual kind={s.icon} className={tall ? "mx-auto max-w-md" : "max-w-xs"} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
