import Link from "next/link";
import type { Metadata } from "next";
import {
  LuAnchor, LuArrowRight, LuArrowUpRight, LuHandshake, LuLayers, LuPhone, LuRoute, LuShip, LuClipboardList,
} from "react-icons/lu";
import PageHero from "@/components/PageHero";
import Photo from "@/components/Photo";
import SectionHeading from "@/components/SectionHeading";
import CtaBand from "@/components/CtaBand";
import { getDictionary } from "@/content/dictionaries";
import { href, isLocale, defaultLocale, type Locale } from "@/content/i18n";
import { company, ferryJo, localizeSpec } from "@/content/site";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale as Locale, "home", "home");
}

const solutionIcons = [LuShip, LuRoute, LuLayers, LuAnchor, LuHandshake, LuClipboardList];

export default async function HomePage({ params }: Props) {
  const { locale: l } = await params;
  const locale = (isLocale(l) ? l : defaultLocale) as Locale;
  const t = getDictionary(locale);
  const h = t.home;

  const vesselStats = [
    { label: t.tug.specs.labels.length, value: localizeSpec(ferryJo.lengthM, t.common.units), unit: "m" },
    { label: t.tug.specs.labels.mainEngine, value: ferryJo.powerHp, unit: t.common.units.hp },
    { label: t.tug.specs.labels.bollardPull, value: ferryJo.bollardPullT, unit: "t" },
  ];

  return (
    <>
      <PageHero
        size="full"
        photo="canalPush"
        alt={t.photos.canalPush}
        eyebrow={h.hero.eyebrow}
        title={h.hero.title}
        sub={h.hero.sub}
        scrollLabel={h.hero.scroll}
        actions={
          <>
            <a href="#content" className="btn-signal">
              {t.common.exploreServices} <LuArrowRight aria-hidden className="h-4 w-4" />
            </a>
            <Link href={href(locale, "contact", "quote")} className="btn-ghost-light">
              {t.common.requestSolution}
            </Link>
          </>
        }
      />

      {/* 2 — Core services */}
      <section id="content" className="scroll-mt-20 bg-white py-24 sm:py-32">
        <div className="container-x">
          <SectionHeading label={h.core.label} title={h.core.title} />
          <div className="mt-14 grid gap-5 lg:grid-cols-2 lg:gap-6">
            {[
              { n: "01", ...h.core.tug, to: href(locale, "tugboat"), photo: "arklowAssist" as const, cta: t.nav.tugboat },
              { n: "02", ...h.core.broker, to: href(locale, "brokerage"), photo: "aerialBargeTwoTugs" as const, cta: t.nav.brokerage },
            ].map((c, i) => (
              <Link
                key={c.n}
                href={c.to}
                data-reveal
                style={{ ["--reveal-delay" as string]: `${i * 120}ms` }}
                className="group relative isolate flex min-h-[460px] flex-col justify-end overflow-hidden rounded-3xl bg-navy p-7 text-white sm:min-h-[560px] sm:p-10"
              >
                <div className="absolute inset-0 -z-10 transition-transform duration-[1.2s] ease-out-expo group-hover:scale-105">
                  <Photo name={c.photo} alt={t.photos[c.photo]} sizes="(min-width:1024px) 50vw, 100vw" />
                </div>
                <div className="absolute inset-0 -z-10 bg-gradient-to-t from-navy via-navy/55 to-navy/5" />
                <span className="absolute top-7 left-7 font-mono text-sm text-white/70 sm:top-10 sm:left-10">{c.n}</span>
                <span className="absolute top-6 right-6 grid h-14 w-14 place-items-center rounded-full border border-white/30 backdrop-blur-sm transition-all duration-500 group-hover:rotate-45 group-hover:border-signal group-hover:bg-signal group-hover:text-navy sm:top-9 sm:right-9">
                  <LuArrowUpRight aria-hidden className="h-6 w-6" />
                </span>
                <h3 className="text-3xl font-extrabold uppercase sm:text-5xl">{c.title}</h3>
                <p className="mt-4 max-w-md text-lg text-white/80">{c.text}</p>
                <span className="mt-8 inline-flex items-center gap-2 font-heading text-sm font-bold tracking-wide text-signal">
                  {t.common.learnMore} <LuArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 3 — About */}
      <section className="bg-mist py-24 sm:py-32">
        <div className="container-x grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          <div data-reveal className="relative">
            <div className="relative aspect-[4/5] overflow-hidden rounded-3xl sm:aspect-[5/4] lg:aspect-[4/5]">
              <Photo name="aerialUnderway" alt={t.photos.aerialUnderway} sizes="(min-width:1024px) 45vw, 100vw" />
            </div>
            <div className="absolute -bottom-8 left-6 right-6 rounded-2xl bg-navy p-6 text-white shadow-2xl sm:right-auto sm:left-auto sm:-right-6 sm:w-80 lg:-right-10">
              <p className="text-[0.7rem] font-semibold tracking-[0.2em] text-teal-light uppercase">{t.common.contactPerson}</p>
              <p className="mt-2 font-heading text-xl font-bold">{company.contactPerson}</p>
              <a href={company.phoneHref} className="mt-4 inline-flex items-center gap-2 text-white/80 hover:text-white">
                <LuPhone aria-hidden className="h-4 w-4 text-signal" /> {company.phoneDisplay}
              </a>
            </div>
          </div>
          <div className="pt-8 lg:pt-0">
            <SectionHeading label={h.about.label} title={h.about.title} />
            {h.about.paras.map((p) => (
              <p key={p.slice(0, 24)} data-reveal className="mt-6 text-lg leading-relaxed text-slate">
                {p}
              </p>
            ))}
            <div data-reveal className="mt-10">
              <Link href={href(locale, "about")} className="btn-outline-dark">
                {h.about.cta} <LuArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4 — Featured vessel */}
      <section className="relative overflow-hidden bg-navy text-white">
        <div className="grid lg:grid-cols-[1.15fr_1fr]">
          <div className="relative min-h-[380px] sm:min-h-[520px] lg:min-h-[720px]">
            <Photo name="iceDusk" alt={t.photos.iceDusk} sizes="(min-width:1024px) 55vw, 100vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-navy/80 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-navy" />
          </div>
          <div className="flex flex-col justify-center px-5 py-16 sm:px-10 lg:py-24 lg:pr-16 lg:pl-6 xl:pr-24">
            <p data-reveal className="eyebrow text-teal-light">{h.vessel.label}</p>
            <h2 data-reveal className="mt-5 text-6xl font-extrabold uppercase sm:text-8xl">{h.vessel.title}</h2>
            <p data-reveal className="mt-6 max-w-lg text-lg leading-relaxed text-white/70">{h.vessel.text}</p>
            <dl data-reveal className="mt-10 grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-white/10">
              {vesselStats.map((s) => (
                <div key={s.label} className="bg-navy p-4 sm:p-6">
                  <dt className="text-[0.66rem] font-semibold tracking-[0.14em] text-white/50 uppercase">{s.label}</dt>
                  <dd className="mt-2 font-heading text-3xl font-extrabold sm:text-4xl">
                    {s.value}
                    <span className="ml-1 text-base text-teal-light">{s.unit}</span>
                  </dd>
                </div>
              ))}
            </dl>
            <p data-reveal className="mt-5 text-sm text-white/45">
              Scania · CCR2 · {t.common.homePort} {ferryJo.homePort} · EU {ferryJo.euNumber}
            </p>
            <div data-reveal className="mt-10 flex flex-wrap gap-3">
              <Link href={href(locale, "tugboat")} className="btn-signal">
                {t.common.viewVessel} <LuArrowRight aria-hidden className="h-4 w-4" />
              </Link>
              <Link href={href(locale, "tugboat", "request")} className="btn-ghost-light">
                {t.common.requestFerryJo}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5 — Solutions grid */}
      <section className="bg-white py-24 sm:py-32">
        <div className="container-x">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <SectionHeading label={h.solutions.label} title={h.solutions.title} />
            <Link data-reveal href={href(locale, "brokerage")} className="btn-outline-dark self-start lg:self-auto">
              {t.nav.brokerage} <LuArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
          <ul className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {h.solutions.items.map((s, i) => {
              const Icon = solutionIcons[i];
              return (
                <li
                  key={s.title}
                  data-reveal
                  style={{ ["--reveal-delay" as string]: `${(i % 3) * 90}ms` }}
                  className="group relative bg-white p-8 transition-colors duration-500 hover:bg-navy sm:p-10"
                >
                  <div className="flex items-start justify-between">
                    <span className="grid h-14 w-14 place-items-center rounded-2xl bg-mist text-teal transition-colors duration-500 group-hover:bg-teal group-hover:text-white">
                      <Icon aria-hidden className="h-6 w-6" />
                    </span>
                    <span className="font-mono text-xs text-slate/60 group-hover:text-white/40">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <h3 className="mt-8 text-xl font-bold text-navy transition-colors duration-500 group-hover:text-white">{s.title}</h3>
                  <p className="mt-3 leading-relaxed text-slate transition-colors duration-500 group-hover:text-white/70">{s.text}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* 6 — Why */}
      <section className="bg-mist py-24 sm:py-32">
        <div className="container-x grid gap-14 lg:grid-cols-[1fr_1.25fr] lg:gap-20">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <SectionHeading label={h.why.label} title={h.why.title} />
            <div data-reveal className="relative mt-10 hidden aspect-[4/3] overflow-hidden rounded-3xl lg:block">
              <Photo name="bowIce" alt={t.photos.bowIce} sizes="40vw" />
            </div>
          </div>
          <ol className="grid gap-4">
            {h.why.items.map((w, i) => (
              <li
                key={w.title}
                data-reveal
                className="group flex gap-6 rounded-2xl border border-line bg-white p-7 transition-all duration-500 hover:-translate-y-0.5 hover:border-teal/40 hover:shadow-[0_20px_50px_-30px_rgba(7,24,39,0.45)] sm:p-8"
              >
                <span className="font-heading text-4xl font-extrabold text-teal/25 tabular-nums transition-colors group-hover:text-teal">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-xl font-bold text-navy">{w.title}</h3>
                  <p className="mt-2 leading-relaxed text-slate">{w.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 7 — CTA */}
      <CtaBand
        title={h.cta.title}
        text={h.cta.text}
        button={t.common.discussProject}
        buttonHref={href(locale, "contact", "quote")}
        callLabel={t.common.callMarc}
        photo="aerialTow"
        alt={t.photos.aerialTow}
      />
    </>
  );
}
