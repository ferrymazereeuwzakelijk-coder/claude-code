import type { Metadata } from "next";
import { LuClock } from "react-icons/lu";
import PageHero from "@/components/PageHero";
import SectionHeading from "@/components/SectionHeading";
import ContactDetails from "@/components/ContactDetails";
import EnquiryForm from "@/components/EnquiryForm";
import MapEmbed from "@/components/MapEmbed";
import { getDictionary } from "@/content/dictionaries";
import { href, isLocale, type Locale } from "@/content/i18n";
import { company } from "@/content/site";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale as Locale, "contact", "contact");
}

export default async function ContactPage({ params }: Props) {
  const { locale: l } = await params;
  const locale = (isLocale(l) ? l : "en") as Locale;
  const t = getDictionary(locale);
  const c = t.contact;

  return (
    <>
      <PageHero photo="escortPort" alt={t.photos.escortPort} eyebrow={c.hero.eyebrow} title={c.hero.title} sub={c.hero.sub} />

      <section id="quote" className="scroll-mt-20 bg-mist py-24 sm:py-32">
        <div className="container-x grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <div>
            <SectionHeading label={c.details.label} title={c.details.title} />
            <div data-reveal className="mt-10">
              <p className="mb-6 font-heading text-lg font-bold text-navy">
                {t.common.contactPerson}: {company.contactPerson}
              </p>
              <ContactDetails t={t.common} />
              <p className="mt-6 flex items-start gap-3 rounded-xl bg-signal/10 p-4 text-sm font-medium text-navy">
                <LuClock aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-signal-dark" /> {c.details.urgent}
              </p>
            </div>
          </div>
          <div data-reveal className="rounded-3xl bg-white p-6 shadow-[0_30px_80px_-50px_rgba(7,24,39,0.5)] sm:p-10">
            <p className="eyebrow text-teal">{c.form.label}</p>
            <h2 className="mt-4 text-3xl font-extrabold text-navy">{c.form.title}</h2>
            <p className="mt-3 mb-8 text-slate">{c.form.intro}</p>
            <EnquiryForm locale={locale} t={t.form} variant="contact" privacyHref={href(locale, "privacy")} />
          </div>
        </div>
      </section>

      <section className="bg-white py-24 sm:py-28">
        <div className="container-x">
          <h2 data-reveal className="mb-8 text-3xl font-extrabold text-navy">{c.map.title}</h2>
          <div data-reveal>
            <MapEmbed title={`${c.map.title} – ${company.name}`} openLabel={c.map.open} />
          </div>
        </div>
      </section>
    </>
  );
}
