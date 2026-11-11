import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Dictionary } from "@/content/dictionaries";
import { href, type Locale } from "@/lib/i18n";
import { SectionHeading } from "./section-heading";

/** Pain points the visitor recognises, each answered with the matching service. */
export function Problems({ locale, dict }: { locale: Locale; dict: Dictionary["problems"] }) {
  return (
    <section id="problems" aria-labelledby="problems-title" className="scroll-mt-24 py-24 md:py-36">
      <div className="container-x">
        <SectionHeading id="problems-title" title={dict.title} intro={dict.intro} />
        <ul className="mt-16 grid gap-4 md:grid-cols-2">
          {dict.items.map((item) => (
            <li key={item.problem}>
              <Link
                href={href(locale, `/services/${item.service}`)}
                className="group flex h-full flex-col rounded-xl border border-line bg-ink-2 p-7 transition-colors duration-500 hover:border-line-strong md:p-9"
              >
                <p className="font-display text-xl font-semibold leading-snug tracking-[-0.02em] text-white md:text-2xl">
                  {item.problem}
                </p>
                <p className="mt-4 leading-relaxed text-mist">{item.answer}</p>
                <span className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-medium text-blue">
                  {dict.link}
                  <ArrowRight aria-hidden className="size-4 transition-transform duration-500 group-hover:translate-x-1" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
