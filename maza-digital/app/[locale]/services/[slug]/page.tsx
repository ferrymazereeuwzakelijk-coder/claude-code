import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/content/dictionaries";
import { getService, services } from "@/content/services";
import { site } from "@/content/site";
import { href, isLocale, locales, t } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { ServiceVisual } from "@/components/sections/service-visual";

type Props = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  return locales.flatMap((locale) => services.map((s) => ({ locale, slug: s.slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const service = getService(slug);
  if (!isLocale(locale) || !service) return {};
  return pageMetadata({
    locale,
    path: `/services/${slug}`,
    title: t(service.title, locale),
    description: t(service.intro, locale).slice(0, 158),
  });
}

export default async function ServicePage({ params }: Props) {
  const { locale, slug } = await params;
  const service = getService(slug);
  if (!isLocale(locale) || !service) notFound();
  const dict = getDictionary(locale);
  const s = dict.services;
  const related = services.filter((x) => x.slug !== service.slug).slice(0, 3);

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: t(service.faqs, locale).map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  const serviceLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: t(service.title, locale),
    description: t(service.intro, locale),
    provider: { "@type": "ProfessionalService", name: site.brandName, url: site.url },
    areaServed: "Worldwide",
  };

  return (
    <>
      <PageHeader
        title={t(service.title, locale)}
        kicker={
          <Link href={href(locale, "/services")} className="hover:text-white">
            {s.all}
          </Link>
        }
      >
        <div className="mt-8 grid gap-12 md:grid-cols-12 md:items-end">
          <p className="type-lead md:col-span-7">{t(service.intro, locale)}</p>
          <div className="md:col-span-4 md:col-start-9">
            <ServiceVisual kind={service.icon} className="max-w-sm" />
          </div>
        </div>
      </PageHeader>

      {/* Use cases */}
      <section aria-labelledby="usecases" className="border-t border-line py-20 md:py-28">
        <div className="container-x">
          <h2 id="usecases" className="type-section">
            {s.useCases}
          </h2>
          <ul className="mt-14 grid gap-4 md:grid-cols-3">
            {t(service.useCases, locale).map((u) => (
              <li key={u.title} className="rounded-xl border border-line bg-ink-2 p-8">
                <h3 className="text-xl font-semibold tracking-[-0.02em]">{u.title}</h3>
                <p className="mt-4 leading-relaxed text-mist">{u.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Deliverables + considerations */}
      <section className="border-t border-line py-20 md:py-28">
        <div className="container-x grid gap-16 md:grid-cols-12">
          <div className="md:col-span-6">
            <h2 className="text-3xl font-semibold tracking-[-0.03em] md:text-4xl">{s.deliverables}</h2>
            <ul className="mt-8 divide-y divide-line border-y border-line">
              {t(service.deliverables, locale).map((d) => (
                <li key={d} className="flex items-center gap-4 py-4 text-white">
                  <span aria-hidden className="h-px w-4 bg-blue" />
                  {d}
                </li>
              ))}
            </ul>
          </div>
          <div className="md:col-span-5 md:col-start-8">
            <h2 className="text-3xl font-semibold tracking-[-0.03em] md:text-4xl">{s.considerations}</h2>
            <ul className="mt-8 space-y-5">
              {t(service.considerations, locale).map((c) => (
                <li key={c} className="leading-relaxed text-mist">
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq" className="border-t border-line py-20 md:py-28">
        <div className="container-x grid gap-12 md:grid-cols-12">
          <h2 id="faq" className="text-3xl font-semibold tracking-[-0.03em] md:col-span-4 md:text-4xl">
            {s.faq}
          </h2>
          <div className="divide-y divide-line border-y border-line md:col-span-8">
            {t(service.faqs, locale).map((f) => (
              <details key={f.q} className="group py-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg font-medium text-white [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span aria-hidden className="text-2xl leading-none text-mist transition-transform duration-300 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-4 max-w-2xl leading-relaxed text-mist">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Service CTA */}
      <section className="border-t border-line py-20 md:py-28">
        <div className="container-x">
          <div className="relative isolate overflow-hidden rounded-xl border border-line bg-ink-2 p-8 md:p-14">
            <div aria-hidden className="glow-blue absolute -right-1/4 -top-1/2 -z-10 h-[200%] w-3/4" />
            <h2 className="type-section max-w-3xl">{s.ctaTitle}</h2>
            <p className="type-lead mt-6">{s.ctaBody}</p>
            <Button asChild size="lg" variant="accent" className="mt-10">
              <Link href={href(locale, "/contact")}>{dict.cta.button}</Link>
            </Button>
          </div>

          <h2 className="mt-24 text-sm text-mist">{s.related}</h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-3">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={href(locale, `/services/${r.slug}`)}
                  className="block rounded-xl border border-line p-6 transition-colors hover:border-line-strong"
                >
                  <span className="font-display text-xl font-semibold tracking-[-0.02em] text-white">{t(r.title, locale)}</span>
                  <span className="mt-2 block text-sm text-mist">{t(r.short, locale)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([serviceLd, faqLd]) }} />
    </>
  );
}
