import type { Metadata } from "next";
import { LuArrowRight, LuCheck, LuShieldCheck } from "react-icons/lu";
import PageHero from "@/components/PageHero";
import Photo from "@/components/Photo";
import SectionHeading from "@/components/SectionHeading";
import ProcessSteps from "@/components/ProcessSteps";
import EnquiryForm from "@/components/EnquiryForm";
import ContactDetails from "@/components/ContactDetails";
import JsonLd from "@/components/JsonLd";
import { getDictionary } from "@/content/dictionaries";
import { href, isLocale, defaultLocale, type Locale } from "@/content/i18n";
import { SITE_URL, photos } from "@/content/site";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale as Locale, "brokerage", "brokerage", photos.pontoonTow.src);
}

export default async function BrokeragePage({ params }: Props) {
  const { locale: l } = await params;
  const locale = (isLocale(l) ? l : defaultLocale) as Locale;
  const t = getDictionary(locale);
  const b = t.broker;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: t.nav.brokerage,
    serviceType: "Maritime brokerage: tugboats, barges, pontoons, workboats and maritime equipment",
    provider: { "@id": `${SITE_URL}/#organization` },
    areaServed: { "@type": "Country", name: "Netherlands" },
    description: t.meta.brokerage.description,
    url: `${SITE_URL}${href(locale, "brokerage")}`,
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: t.nav.brokerage,
      itemListElement: b.services.map((s) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: s.title, description: s.text } })),
    },
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <PageHero
        photo="pontoonTow"
        alt={t.photos.pontoonTow}
        eyebrow={b.hero.eyebrow}
        title={b.hero.title}
        sub={b.hero.sub}
        actions={
          <>
            <a href="#enquiry" className="btn-signal">
              {t.common.requestSolution} <LuArrowRight aria-hidden className="h-4 w-4" />
            </a>
            <a href="#process" className="btn-ghost-light">
              {b.process.label}
            </a>
          </>
        }
      />

      {/* Intro */}
      <section id="content" className="bg-bone py-24 sm:py-32">
        <div className="container-x grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
          <SectionHeading label={b.intro.label} title={b.intro.title} />
          <div data-reveal className="lg:pt-14">
            <p className="text-lg leading-relaxed text-slate">{b.intro.text}</p>
            <p className="mt-8 flex gap-4 rounded-2xl border border-teal/20 bg-teal/5 p-5 text-sm leading-relaxed text-navy">
              <LuShieldCheck aria-hidden className="h-5 w-5 shrink-0 text-teal" />
              {b.intro.note}
            </p>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="bg-mist py-24 sm:py-32">
        <div className="container-x grid gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div className="hidden lg:sticky lg:top-32 lg:block lg:self-start">
            <div data-reveal className="relative aspect-[4/5] overflow-hidden rounded-3xl">
              <Photo name="aerialTow" alt={t.photos.aerialTow} sizes="(min-width:1024px) 35vw, 100vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-transparent to-transparent" />
              <p className="absolute right-6 bottom-6 left-6 font-heading text-2xl leading-tight font-extrabold text-white uppercase">
                {b.hero.title.join(" ")}
              </p>
            </div>
          </div>
          <ol className="grid gap-5">
            {b.services.map((s, i) => (
              <li key={s.title} data-reveal className="rounded-3xl border border-line bg-white p-7 sm:p-10">
                <div className="flex items-baseline gap-5">
                  <span className="font-mono text-sm text-teal">{String(i + 1).padStart(2, "0")}</span>
                  <h2 className="text-2xl font-extrabold text-navy sm:text-3xl">{s.title}</h2>
                </div>
                <p className="mt-4 leading-relaxed text-slate sm:pl-10">{s.text}</p>
                <ul className="mt-6 flex flex-wrap gap-2 sm:pl-10">
                  {s.points.map((pt) => (
                    <li key={pt} className="inline-flex items-center gap-2 rounded-full bg-mist px-4 py-2 text-sm font-medium text-navy">
                      <LuCheck aria-hidden className="h-4 w-4 text-teal" /> {pt}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Process */}
      <section id="process" className="scroll-mt-20 bg-navy py-24 text-white sm:py-32">
        <div className="container-x">
          <SectionHeading tone="light" align="center" label={b.process.label} title={b.process.title} />
          <div className="mt-16">
            <ProcessSteps steps={b.process.steps} />
          </div>
        </div>
      </section>

      {/* Enquiry form */}
      <section id="enquiry" className="scroll-mt-20 bg-mist py-24 sm:py-32">
        <div className="container-x grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <div>
            <SectionHeading label={b.form.label} title={b.form.title} intro={b.form.intro} />
            <div data-reveal className="mt-10">
              <ContactDetails t={t.common} />
            </div>
          </div>
          <div data-reveal className="rounded-3xl bg-white p-6 shadow-[0_30px_80px_-50px_rgba(7,24,39,0.5)] sm:p-10">
            <EnquiryForm locale={locale} t={t.form} variant="brokerage" privacyHref={href(locale, "privacy")} />
          </div>
        </div>
      </section>
    </>
  );
}
