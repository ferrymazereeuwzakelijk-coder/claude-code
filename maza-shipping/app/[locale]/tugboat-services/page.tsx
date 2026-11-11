import Link from "next/link";
import type { Metadata } from "next";
import { LuArrowRight, LuArrowUpRight, LuLayers, LuNavigation, LuRoute, LuShip, LuSnowflake } from "react-icons/lu";
import PageHero from "@/components/PageHero";
import Photo from "@/components/Photo";
import SectionHeading from "@/components/SectionHeading";
import SpecTable from "@/components/SpecTable";
import Gallery from "@/components/Gallery";
import Faq from "@/components/Faq";
import EnquiryForm from "@/components/EnquiryForm";
import ContactDetails from "@/components/ContactDetails";
import JsonLd from "@/components/JsonLd";
import { getDictionary } from "@/content/dictionaries";
import { href, isLocale, type Locale } from "@/content/i18n";
import { SITE_URL, ferryJo, photos } from "@/content/site";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale as Locale, "tugboat", "tugboat", photos.arklowAssist.src);
}

const capIcons = [LuRoute, LuShip, LuSnowflake, LuNavigation, LuLayers];

export default async function TugboatPage({ params }: Props) {
  const { locale: l } = await params;
  const locale = (isLocale(l) ? l : "en") as Locale;
  const t = getDictionary(locale);
  const p = t.tug;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: `${t.nav.tugboat} – ${ferryJo.name}`,
      serviceType: "Tugboat charter, towing and pushing, launch assistance, icebreaking, vessel escort",
      provider: { "@id": `${SITE_URL}/#organization` },
      areaServed: { "@type": "Country", name: "Netherlands" },
      description: t.meta.tugboat.description,
      url: `${SITE_URL}${href(locale, "tugboat")}`,
      image: photos.arklowAssist.src,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: p.faq.items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <PageHero
        photo="arklowAssist"
        alt={t.photos.arklowAssist}
        eyebrow={p.hero.eyebrow}
        title={p.hero.title}
        sub={p.hero.sub}
        stats={[
          { label: p.specs.labels.length, value: ferryJo.lengthM, unit: "m" },
          { label: p.specs.labels.mainEngine, value: ferryJo.powerHp, unit: "hp" },
          { label: p.specs.labels.bollardPull, value: ferryJo.bollardPullT, unit: "t" },
        ]}
        actions={
          <>
            <a href="#request" className="btn-signal">
              {t.common.requestFerryJo} <LuArrowRight aria-hidden className="h-4 w-4" />
            </a>
            <a href="#specs" className="btn-ghost-light">
              {p.specs.label}
            </a>
          </>
        }
      />

      {/* Intro */}
      <section id="content" className="bg-white py-24 sm:py-32">
        <div className="container-x grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          <div>
            <SectionHeading label={p.intro.label} title={p.intro.title} />
            {p.intro.paras.map((para) => (
              <p key={para.slice(0, 24)} data-reveal className="mt-6 text-lg leading-relaxed text-slate">
                {para}
              </p>
            ))}
          </div>
          <div data-reveal className="grid grid-cols-5 grid-rows-[repeat(6,52px)] gap-3 sm:grid-rows-[repeat(6,72px)]">
            <div className="relative col-span-3 row-span-6 overflow-hidden rounded-2xl">
              <Photo name="launch" alt={t.photos.launch} sizes="(min-width:1024px) 28vw, 60vw" />
            </div>
            <div className="relative col-span-2 row-span-3 overflow-hidden rounded-2xl">
              <Photo name="bowIce" alt={t.photos.bowIce} sizes="20vw" />
            </div>
            <div className="relative col-span-2 row-span-3 overflow-hidden rounded-2xl">
              <Photo name="escortPort" alt={t.photos.escortPort} sizes="20vw" />
            </div>
          </div>
        </div>
      </section>

      {/* Specs */}
      <section id="specs" className="scroll-mt-20 bg-mist py-24 sm:py-32">
        <div className="container-x grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <SectionHeading label={p.specs.label} title={p.specs.title} />
            <div data-reveal className="relative mt-10 aspect-[4/3] overflow-hidden rounded-3xl">
              <Photo name="snowyQuay" alt={t.photos.snowyQuay} sizes="(min-width:1024px) 40vw, 100vw" />
              <span className="absolute bottom-4 left-4 rounded-full bg-navy/80 px-4 py-2 font-heading text-sm font-bold text-white backdrop-blur">
                {ferryJo.name} · EU {ferryJo.euNumber}
              </span>
            </div>
            <p data-reveal className="mt-6 text-slate">{p.specs.downloadHint}</p>
          </div>
          <SpecTable rows={ferryJo.specs} labels={p.specs.labels} typeValue={p.specs.typeValue} caption={`${ferryJo.name} – ${p.specs.title}`} note={p.specs.note} />
        </div>
      </section>

      {/* Capabilities */}
      <section className="bg-navy py-24 text-white sm:py-32">
        <div className="container-x">
          <SectionHeading tone="light" label={p.capabilities.label} title={p.capabilities.title} />
          <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {p.capabilities.items.map((c, i) => {
              const Icon = capIcons[i];
              return (
                <li
                  key={c.title}
                  data-reveal
                  style={{ ["--reveal-delay" as string]: `${i * 80}ms` }}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-7 transition-colors duration-500 hover:border-teal-light/50 hover:bg-white/[0.06]"
                >
                  <Icon aria-hidden className="h-7 w-7 text-teal-light" />
                  <h3 className="mt-6 text-lg font-bold">{c.title}</h3>
                  <p className="mt-3 text-[0.95rem] leading-relaxed text-white/65">{c.text}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Gallery */}
      <section className="bg-white py-24 sm:py-32">
        <div className="container-x">
          <SectionHeading label={p.gallery.label} title={p.gallery.title} />
          <div className="mt-14">
            <Gallery items={ferryJo.gallery} alts={t.photos} labels={p.gallery} />
          </div>
        </div>
      </section>

      {/* Request */}
      <section id="request" className="scroll-mt-20 bg-mist py-24 sm:py-32">
        <div className="container-x grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <div>
            <SectionHeading label={t.common.requestFerryJo} title={p.availability.title} intro={p.availability.text} />
            <div data-reveal className="mt-10">
              <ContactDetails t={t.common} />
            </div>
          </div>
          <div data-reveal className="rounded-3xl bg-white p-6 shadow-[0_30px_80px_-50px_rgba(7,24,39,0.5)] sm:p-10">
            <EnquiryForm locale={locale} t={t.form} variant="charter" defaultService="ferryjo" privacyHref={href(locale, "privacy")} />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 bg-white py-24 sm:py-32">
        <div className="container-x grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading label={p.faq.label} title={p.faq.title} />
          <Faq items={p.faq.items} />
        </div>
      </section>

      {/* Cross-sell brokerage */}
      <section className="bg-white pb-24 sm:pb-32">
        <div className="container-x">
          <Link
            href={href(locale, "brokerage")}
            data-reveal
            className="group relative isolate flex flex-col gap-6 overflow-hidden rounded-3xl bg-marine p-8 text-white sm:flex-row sm:items-center sm:justify-between sm:p-12"
          >
            <div className="absolute inset-0 -z-10 opacity-30 transition-opacity duration-700 group-hover:opacity-45">
              <Photo name="aerialBargeTwoTugs" alt="" sizes="100vw" />
            </div>
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-marine via-marine/90 to-marine/40" />
            <div>
              <p className="eyebrow text-teal-light">{t.nav.brokerage}</p>
              <p className="mt-4 max-w-2xl font-heading text-2xl font-extrabold sm:text-3xl">{p.faq.items[3].q}</p>
            </div>
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-signal text-navy transition-transform duration-500 group-hover:rotate-45">
              <LuArrowUpRight aria-hidden className="h-7 w-7" />
            </span>
          </Link>
        </div>
      </section>
    </>
  );
}
