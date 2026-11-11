import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { getDictionary } from "@/content/dictionaries";
import { services } from "@/content/services";
import { href, isLocale, t } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/layout/page-header";
import { ClosingCta } from "@/components/sections/cta";
import { ServiceVisual } from "@/components/sections/service-visual";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const d = getDictionary(locale).meta;
  return pageMetadata({ locale, path: "/services", title: d.servicesTitle, description: d.servicesDescription });
}

export default async function ServicesPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <>
      <PageHeader title={dict.services.title} intro={dict.services.intro} />

      <section aria-label={dict.meta.servicesTitle} className="pb-24 md:pb-36">
        <ul className="container-x border-t border-line">
          {services.map((s) => (
            <li key={s.slug} className="border-b border-line">
              <Link
                href={href(locale, `/services/${s.slug}`)}
                className="group grid gap-8 py-12 md:grid-cols-12 md:items-center md:py-16"
              >
                <h2 className="text-[clamp(2rem,4.5vw,3.75rem)] font-semibold leading-none tracking-[-0.045em] transition-colors md:col-span-5">
                  {t(s.title, locale)}
                </h2>
                <div className="md:col-span-4">
                  <p className="leading-relaxed text-mist">{t(s.short, locale)}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm text-white">
                    {dict.services.more} {t(s.title, locale).toLowerCase()}
                    <ArrowUpRight aria-hidden className="size-4 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </span>
                </div>
                <div className="hidden md:col-span-3 md:block">
                  <ServiceVisual kind={s.icon} className="ml-auto max-w-[220px] opacity-80 transition-opacity duration-500 group-hover:opacity-100" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <ClosingCta locale={locale} dict={dict.cta} />
    </>
  );
}
