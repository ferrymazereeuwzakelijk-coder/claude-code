import Link from "next/link";
import type { Metadata } from "next";
import { LuArrowRight, LuArrowUpRight, LuPhone } from "react-icons/lu";
import ShipHero, { type Callout } from "@/components/ShipHero";
import ScrollVideo from "@/components/ScrollVideo";
import Photo from "@/components/Photo";
import Logo from "@/components/Logo";
import { getDictionary } from "@/content/dictionaries";
import { href, isLocale, defaultLocale, type Locale } from "@/content/i18n";
import { clips, company, ferryJo, localizeSpec, photos, video } from "@/content/site";
import ClipStrip from "@/components/ClipStrip";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale as Locale, "home", "home");
}

export default async function HomePage({ params }: Props) {
  const { locale: l } = await params;
  const locale = (isLocale(l) ? l : defaultLocale) as Locale;
  const t = getDictionary(locale);
  const h = t.home;
  const u = t.common.units;

  // Spec values shown in the 3D callouts, in the same order as the dictionary entries
  const values: Pick<Callout, "value" | "unit">[] = [
    { value: localizeSpec(ferryJo.lengthM, u), unit: "m" },
    { value: ferryJo.powerHp, unit: u.hp },
    { value: ferryJo.bollardPullT, unit: "t" },
    { value: localizeSpec("20.5", u), unit: "km/h" },
  ];
  const callouts: Callout[] = h.ship.callouts.map((c, i) => ({ ...c, ...values[i] }));

  const marquee = t.tug.capabilities.items.map((c) => c.title).concat(t.nav.brokerage);

  return (
    <>
      <ShipHero
        eyebrow={h.hero.eyebrow}
        title={h.hero.title}
        sub={h.hero.sub}
        hint={h.ship.hint}
        hud={h.ship.hud}
        callouts={callouts}
        final={h.ship.final}
        fallbackText={h.ship.fallback}
        fallbackImage={{ src: photos.assistWeserborg.src, alt: t.photos.assistWeserborg }}
        coords={company.geo.label}
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
        finalActions={
          <>
            <Link href={href(locale, "tugboat", "request")} className="btn-signal">
              {t.common.requestFerryJo} <LuArrowRight aria-hidden className="h-4 w-4" />
            </Link>
            <Link href={href(locale, "tugboat")} className="btn-ghost-light">
              {t.common.viewVessel}
            </Link>
          </>
        }
      />

      {/* Marquee */}
      <div aria-hidden className="relative overflow-hidden border-y border-white/10 bg-navy py-6 text-white sm:py-8">
        <div className="flex w-max animate-marquee">
          {[0, 1].map((k) => (
            <div key={k} className="flex shrink-0 items-center">
              {marquee.map((m, i) => (
                <span key={m} className="display flex items-center text-4xl sm:text-6xl">
                  <span className={i % 2 ? "outline-text text-white/60" : ""}>{m}</span>
                  <span className="mx-8 inline-block h-3 w-3 rotate-45 bg-teal sm:mx-12" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Divisions */}
      <section id="content" className="scroll-mt-20 bg-navy pt-24 pb-10 text-white sm:pt-32">
        <div className="container-x">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div data-reveal>
              <p className="eyebrow text-teal-light">{h.core.label}</p>
              <h2 className="display mt-6 max-w-4xl text-[2.3rem] sm:text-7xl lg:text-7xl xl:text-8xl">{h.core.title}</h2>
            </div>
            <p data-reveal className="hud max-w-xs text-white/45">
              {company.address.city} · NL — {company.geo.label}
            </p>
          </div>
        </div>
        <div className="mt-16 grid gap-px bg-white/10 lg:grid-cols-2">
          {[
            { n: "01", ...h.core.tug, to: href(locale, "tugboat"), img: photos.assistWeserborg.src, alt: t.photos.assistWeserborg },
            { n: "02", ...h.core.broker, to: href(locale, "brokerage"), img: photos.pontoonTow.src, alt: t.photos.pontoonTow },
          ].map((c) => (
            <Link
              key={c.n}
              href={c.to}
              className="group relative isolate flex min-h-[78svh] flex-col justify-between overflow-hidden bg-navy p-6 sm:p-12"
            >
              <div className="absolute inset-0 -z-10 opacity-60 transition-all duration-[1.4s] ease-out-expo group-hover:scale-105 group-hover:opacity-90">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.img} alt={c.alt} loading="lazy" className="h-full w-full object-cover grayscale-[35%] transition duration-700 group-hover:grayscale-0" />
              </div>
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-navy via-navy/50 to-navy/70" />
              <div className="flex items-start justify-between">
                <span className="display text-[7rem] text-white/15 transition-colors duration-700 group-hover:text-teal sm:text-[10rem]">{c.n}</span>
                <span className="grid h-16 w-16 place-items-center bg-white/10 backdrop-blur transition-all duration-500 group-hover:rotate-45 group-hover:bg-signal">
                  <LuArrowUpRight aria-hidden className="h-7 w-7" />
                </span>
              </div>
              <div>
                <h3 className="display text-[2.1rem] sm:text-5xl xl:text-6xl">{c.title}</h3>
                <p className="mt-5 max-w-md text-lg text-white/80">{c.text}</p>
                <span className="hud mt-8 inline-flex items-center gap-2 text-teal-light">
                  {t.common.learnMore} <LuArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent work: upright clips + ice photo */}
      <ClipStrip
        label={h.work.label}
        title={h.work.title}
        items={[
          { kind: "video", ...clips.dock, ...h.work.items[0], alt: t.photos.dockHunteborgPortrait },
          { kind: "video", ...clips.assist, ...h.work.items[1], alt: t.photos.assistWeserborg },
          { kind: "image", src: photos.ferryjoIce.src, ...h.work.items[2], alt: t.photos.ferryjoIce },
        ]}
      />

      {/* Footage */}
      <ScrollVideo src={video.src} poster={video.poster} label={h.video.label} title={h.video.title} text={h.video.text} />

      {/* About */}
      <section className="relative overflow-hidden bg-bone py-24 sm:py-36">
        <div className="container-x grid items-center gap-16 lg:grid-cols-[1fr_1.1fr] lg:gap-24">
          <div data-reveal className="relative mx-auto grid w-full max-w-lg grid-cols-2 gap-4">
            <div className="relative aspect-[9/20] overflow-hidden rounded-3xl">
              <Photo name="deckTowClose" alt={t.photos.deckTowClose} sizes="(min-width:1024px) 22vw, 45vw" />
            </div>
            <div className="relative mt-16 aspect-[9/20] overflow-hidden rounded-3xl">
              <Photo name="deckTowSea" alt={t.photos.deckTowSea} sizes="(min-width:1024px) 22vw, 45vw" />
            </div>
            <div className="hud absolute -bottom-6 left-1/2 w-max -translate-x-1/2 bg-navy px-4 py-3 text-white">
              <span className="text-teal-light">POV</span> · {t.common.contactPerson.toUpperCase()}: {company.contactPerson.toUpperCase()}
            </div>
          </div>
          <div>
            <p data-reveal className="eyebrow text-teal">{h.about.label}</p>
            <h2 data-reveal className="display mt-6 text-[2.6rem] text-navy sm:text-6xl lg:text-6xl xl:text-7xl">{h.about.title}</h2>
            {h.about.paras.map((p) => (
              <p key={p.slice(0, 24)} data-reveal className="mt-6 text-lg leading-relaxed text-slate">
                {p}
              </p>
            ))}
            <div data-reveal className="mt-10 flex flex-wrap gap-3">
              <Link href={href(locale, "about")} className="btn-dark">
                {h.about.cta} <LuArrowRight aria-hidden className="h-4 w-4" />
              </Link>
              <a href={company.phoneHref} className="btn-outline-dark">
                <LuPhone aria-hidden className="h-4 w-4" /> {company.phoneDisplay}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Solutions index */}
      <section className="bg-bone pb-24 sm:pb-36">
        <div className="container-x">
          <div className="flex flex-col justify-between gap-8 border-b border-navy/15 pb-10 lg:flex-row lg:items-end">
            <div data-reveal>
              <p className="eyebrow text-teal">{h.solutions.label}</p>
              <h2 className="display mt-6 max-w-4xl text-[2.6rem] sm:text-6xl lg:text-6xl xl:text-7xl">{h.solutions.title}</h2>
            </div>
            <Link data-reveal href={href(locale, "brokerage")} className="btn-outline-dark self-start lg:self-auto">
              {t.nav.brokerage} <LuArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
          <ul>
            {h.solutions.items.map((s, i) => (
              <li key={s.title} data-reveal className="group relative isolate border-b border-navy/15">
                <span className="absolute inset-0 -z-10 origin-bottom scale-y-0 bg-navy transition-transform duration-500 ease-out-expo group-hover:scale-y-100" />
                <div className="grid items-center gap-3 py-8 transition-colors duration-500 group-hover:text-white lg:grid-cols-[4rem_1.1fr_1fr_3rem] lg:gap-8 lg:px-4 lg:py-10">
                  <span className="hud text-teal">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="display text-[1.7rem] sm:text-4xl xl:text-5xl">{s.title}</h3>
                  <p className="text-slate transition-colors duration-500 group-hover:text-white/70 sm:text-lg">{s.text}</p>
                  <LuArrowUpRight aria-hidden className="hidden h-8 w-8 text-teal transition-transform duration-500 group-hover:rotate-45 lg:block" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Why */}
      <section className="bg-navy py-24 text-white sm:py-36">
        <div className="container-x grid gap-14 lg:grid-cols-[1fr_1.2fr] lg:gap-24">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <p data-reveal className="eyebrow text-teal-light">{h.why.label}</p>
            <h2 data-reveal className="display mt-6 text-[2.6rem] sm:text-6xl lg:text-5xl 2xl:text-7xl">{h.why.title}</h2>
            <div data-reveal className="relative mt-10 hidden aspect-[16/10] overflow-hidden rounded-3xl lg:block">
              <Photo name="ferryjoIce" alt={t.photos.ferryjoIce} sizes="40vw" />
            </div>
          </div>
          <ol className="grid gap-px bg-white/10">
            {h.why.items.map((w, i) => (
              <li key={w.title} data-reveal className="group flex gap-6 bg-navy py-8 sm:gap-10 sm:py-10">
                <span className="display text-5xl text-white/15 transition-colors duration-500 group-hover:text-signal sm:text-7xl">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="pt-1">
                  <h3 className="text-2xl font-extrabold">{w.title}</h3>
                  <p className="mt-3 text-lg leading-relaxed text-white/65">{w.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Call to action */}
      <section className="relative isolate overflow-hidden bg-teal text-navy">
        <Logo className="pointer-events-none absolute -right-[8%] -bottom-[18%] -z-10 w-[80%] text-navy opacity-[0.08]" />
        <div className="container-x py-24 sm:py-36">
          <p data-reveal className="eyebrow">{t.common.contactPerson}: {company.contactPerson}</p>
          <h2 data-reveal className="display mt-8 text-[3rem] sm:text-8xl lg:text-[6rem] 2xl:text-[8rem]">
            {h.cta.title.map((line, i) => (
              <span key={line} className={`block ${i === h.cta.title.length - 1 ? "text-white" : ""}`}>{line}</span>
            ))}
          </h2>
          <div data-reveal className="mt-12 grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
            <p className="max-w-xl text-lg text-navy/80 sm:text-xl">{h.cta.text}</p>
            <div className="flex flex-wrap gap-3">
              <Link href={href(locale, "contact", "quote")} className="btn-dark">
                {t.common.discussProject} <LuArrowRight aria-hidden className="h-4 w-4" />
              </Link>
              <a href={company.phoneHref} className="btn bg-white text-navy hover:bg-navy hover:text-white">
                <LuPhone aria-hidden className="h-4 w-4" /> {company.phoneDisplay}
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
