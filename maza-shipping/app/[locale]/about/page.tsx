import Link from "next/link";
import type { Metadata } from "next";
import { LuArrowRight, LuMail, LuPhone } from "react-icons/lu";
import PageHero from "@/components/PageHero";
import Photo from "@/components/Photo";
import SectionHeading from "@/components/SectionHeading";
import CtaBand from "@/components/CtaBand";
import { getDictionary } from "@/content/dictionaries";
import { href, isLocale, defaultLocale, type Locale } from "@/content/i18n";
import { company, photos } from "@/content/site";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale as Locale, "about", "about", photos.ferryjoIce.src);
}

export default async function AboutPage({ params }: Props) {
  const { locale: l } = await params;
  const locale = (isLocale(l) ? l : defaultLocale) as Locale;
  const t = getDictionary(locale);
  const a = t.about;

  return (
    <>
      <PageHero photo="ferryjoIce" alt={t.photos.ferryjoIce} eyebrow={a.hero.eyebrow} title={a.hero.title} sub={a.hero.sub} />

      {/* Story */}
      <section id="content" className="bg-bone py-24 sm:py-32">
        <div className="container-x grid gap-14 lg:grid-cols-2 lg:gap-20">
          <div>
            <SectionHeading label={a.story.label} title={a.story.title} />
          </div>
          <div className="lg:pt-14">
            {a.story.paras.map((p, i) => (
              <p
                key={p.slice(0, 24)}
                data-reveal
                className={`text-lg leading-relaxed ${i === a.story.paras.length - 1 ? "mt-8 border-l-2 border-signal pl-6 font-heading text-xl font-bold text-navy" : "mt-6 text-slate first:mt-0"}`}
              >
                {p}
              </p>
            ))}
          </div>
        </div>
        <div className="container-x mt-20 grid gap-4 sm:grid-cols-3">
          {(["deckTowSea", "dockHunteborgPortrait", "deckTowClose"] as const).map((k, i) => (
            <div
              key={k}
              data-reveal
              style={{ ["--reveal-delay" as string]: `${i * 100}ms` }}
              className={`relative overflow-hidden rounded-2xl ${i === 1 ? "aspect-[3/4] sm:translate-y-10" : "aspect-[3/4]"}`}
            >
              <Photo name={k} alt={t.photos[k]} sizes="(min-width:640px) 33vw, 100vw" />
            </div>
          ))}
        </div>
      </section>

      {/* Marc */}
      <section className="bg-navy py-24 text-white sm:py-32">
        <div className="container-x grid items-center gap-14 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
          <div data-reveal className="relative aspect-[4/5] overflow-hidden rounded-3xl sm:aspect-[5/4] lg:aspect-[4/5]">
            <Photo name="dockHunteborgPortrait" alt={t.photos.dockHunteborgPortrait} sizes="(min-width:1024px) 45vw, 100vw" />
          </div>
          <div>
            <SectionHeading tone="light" label={a.marc.label} title={a.marc.title} />
            {a.marc.paras.map((p) => (
              <p key={p.slice(0, 24)} data-reveal className="mt-6 text-lg leading-relaxed text-white/70">
                {p}
              </p>
            ))}
            <div data-reveal className="mt-10 flex flex-wrap gap-3">
              <a href={company.phoneHref} className="btn-signal">
                <LuPhone aria-hidden className="h-4 w-4" /> {company.phoneDisplay}
              </a>
              <a href={`mailto:${company.email}`} className="btn-ghost-light">
                <LuMail aria-hidden className="h-4 w-4" /> {company.email}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Approach */}
      <section className="bg-mist py-24 sm:py-32">
        <div className="container-x">
          <SectionHeading label={a.approach.label} title={a.approach.title} />
          <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {a.approach.items.map((it, i) => (
              <li key={it.title} data-reveal style={{ ["--reveal-delay" as string]: `${i * 90}ms` }} className="rounded-2xl border border-line bg-white p-7">
                <span className="font-heading text-4xl font-extrabold text-teal/30">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-5 text-lg font-bold text-navy">{it.title}</h3>
                <p className="mt-2 leading-relaxed text-slate">{it.text}</p>
              </li>
            ))}
          </ul>
          <div data-reveal className="mt-12 flex flex-wrap gap-3">
            <Link href={href(locale, "tugboat")} className="btn-dark">
              {t.nav.tugboat} <LuArrowRight aria-hidden className="h-4 w-4" />
            </Link>
            <Link href={href(locale, "brokerage")} className="btn-outline-dark">
              {t.nav.brokerage} <LuArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <CtaBand
        title={t.home.cta.title}
        text={t.home.cta.text}
        button={t.common.discussProject}
        buttonHref={href(locale, "contact", "quote")}
        callLabel={t.common.callMarc}
        photo="pontoonTow"
        alt={t.photos.pontoonTow}
      />
    </>
  );
}
