import Link from 'next/link';
import { currentUser } from '@/lib/auth/session';
import { homeFor } from '@/lib/auth/guards';
import { Logo } from '@/components/ui';
import { SiteFooter } from '@/components/site-footer';
import { isWhatsAppEnabled } from '@/lib/env';
import Image from 'next/image';
import { img, tradeImage, tradeImageAlt } from '@/lib/images';
import { BeforeAfter } from '@/components/before-after';

const STEPS = [
  { n: '01', t: 'Stuur een foto', d: 'Via WhatsApp of de website. Vertel in je eigen woorden wat er moet gebeuren.', image: 'steps/stap-1-foto.jpg' },
  { n: '02', t: 'AI maakt de opdracht', d: 'Een paar korte vragen, daarna een heldere omschrijving. Jij controleert en bevestigt.', image: 'steps/stap-2-controleren.jpg' },
  { n: '03', t: 'Vergelijk offertes', d: 'Geverifieerde vakmensen uit je regio reageren. Jij kiest — ook gewoon in WhatsApp.', image: 'steps/stap-3-vakman.jpg' },
];

// Launch region: trade cards link to the Utrecht landing pages.
// [slug, label, use the alternative photo] — the mix shows the range of people who do this work.
const POPULAR: [string, string, boolean][] = [
  ['schilderwerk', 'Schilder', true], ['tuinonderhoud', 'Hovenier', true], ['loodgieter', 'Loodgieter', false], ['bestrating', 'Stratenmaker', false],
  ['dakwerk', 'Dakdekker', false], ['elektra', 'Elektricien', true], ['timmerwerk', 'Timmerman', true], ['badkamer', 'Badkamer', false],
];

const EXAMPLES = [
  { key: 'schutting', label: 'Schutting beitsen' },
  { key: 'tuin', label: 'Tuinonderhoud' },
  { key: 'kozijn', label: 'Kozijn schilderen' },
  { key: 'badkamer', label: 'Badkamer renoveren' },
];

export default async function Home() {
  const user = await currentUser();
  // Never promise WhatsApp before the real number is connected.
  const wa = isWhatsAppEnabled();
  return (
    <div className="overflow-x-hidden">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex h-20 max-w-6xl items-center gap-8 px-6">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm font-medium text-navy-600 md:flex">
            <a href="#hoe-het-werkt" className="hover:text-navy-900">Hoe het werkt</a>
            <Link href="/voor-vakmensen" className="hover:text-navy-900">Voor vakmensen</Link>
            <a href="#vertrouwen" className="hover:text-navy-900">Vertrouwen</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <Link href={homeFor(user.role)} className="btn-dark">Naar dashboard</Link>
            ) : (
              <>
                <Link href="/inloggen" className="btn-ghost hidden sm:inline-flex">Inloggen</Link>
                <Link href="/registreren" className="btn-dark">Klus plaatsen</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative bg-sand-50 pb-20 pt-32 sm:pt-40">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_50%_at_80%_10%,rgba(16,185,129,0.14),transparent_70%),radial-gradient(40%_40%_at_0%_100%,rgba(11,27,51,0.06),transparent_70%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-leaf-200 bg-white px-3 py-1 text-xs font-semibold text-leaf-800 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-leaf-500" /> {wa ? 'Nieuw: klussen regelen via WhatsApp' : 'Binnenkort: klussen regelen via WhatsApp'}
            </span>
            <h1 className="mt-6 text-[42px] font-extrabold leading-[1.05] text-navy-900 sm:text-6xl">
              Je klus geregeld.<br />
              <span className="bg-gradient-to-r from-leaf-600 to-leaf-500 bg-clip-text text-transparent">{wa ? 'Gewoon via WhatsApp.' : 'Zonder gedoe.'}</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-navy-500">
              Stuur een foto van wat er moet gebeuren. Onze assistent stelt een paar slimme vragen, schrijft een duidelijke opdracht en zet hem — na jouw akkoord — uit bij geverifieerde vakmensen bij jou in de buurt.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href={user?.role === 'customer' ? '/klant/nieuw' : '/registreren'} className="btn-primary px-6 py-3.5 text-base">Plaats je klus gratis</Link>
              <Link href="/voor-vakmensen" className="btn-secondary px-6 py-3.5 text-base">Ik ben vakman</Link>
            </div>
            <p className="mt-5 text-sm text-navy-400">Geen verplichtingen · Je adres blijft privé tot jij een offerte kiest</p>
          </div>

          {/* Photo with illustrative product overlays */}
          <div className="relative mx-auto w-full max-w-lg animate-fade-up [animation-delay:120ms]">
            <div className="overflow-hidden rounded-[2rem] shadow-lift">
              <Image {...img('hero/hero-klant.jpg')} priority sizes="(min-width: 1024px) 512px, 100vw" className="aspect-[4/5] w-full object-cover sm:aspect-[5/4]" />
            </div>
            {wa && (
              <div className="absolute -left-4 top-6 max-w-[230px] rounded-2xl rounded-tl-sm bg-[#DCF8C6] px-3.5 py-2.5 text-sm text-navy-900 shadow-lift sm:-left-10" aria-hidden>
                Schutting moet geschilderd worden 📷
                <span className="mt-0.5 block text-right text-[10px] text-navy-400">via WhatsApp ✓✓</span>
              </div>
            )}
            <div className="absolute -bottom-6 -right-2 w-56 rotate-[2deg] rounded-2xl border border-navy-100 bg-white p-4 shadow-lift sm:-right-8" aria-hidden>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-leaf-700">Nieuwe offerte</p>
              <p className="mt-1 text-sm font-semibold text-navy-900">Schildersbedrijf · 4 km</p>
              <p className="font-display text-2xl font-bold text-navy-900">€ 850</p>
              <p className="text-xs text-navy-400">Vaste prijs · kan volgende week starten</p>
            </div>
          </div>
        </div>
      </section>

      {/* Popular jobs */}
      <section className="mx-auto max-w-6xl px-6 pt-24">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Populaire klussen</p>
            <h2 className="mt-3 text-3xl font-bold text-navy-900 sm:text-4xl">Waar kunnen we je mee helpen?</h2>
          </div>
          <Link href="/registreren" className="text-sm font-semibold text-leaf-700 hover:underline">Zie je jouw klus niet? Plaats hem gewoon →</Link>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {POPULAR.map(([slug, label, alt]) => {
            const photo = alt ? tradeImageAlt(slug) : tradeImage(slug);
            return (
              <Link key={slug} href={`/klus/${slug}/utrecht`} className="group relative overflow-hidden rounded-2xl bg-navy-900 shadow-card">
                {photo && <Image {...photo} sizes="(min-width: 768px) 25vw, 50vw" className="aspect-[4/3] w-full object-cover opacity-90 transition duration-500 group-hover:scale-105 group-hover:opacity-100" />}
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950/85 to-transparent px-4 pb-3 pt-10 font-semibold text-white">{label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Before / after */}
      <section className="mx-auto max-w-6xl px-6 pt-24">
        <div className="grid items-center gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="eyebrow">Van foto naar resultaat</p>
            <h2 className="mt-3 text-3xl font-bold text-navy-900 sm:text-4xl">Stuur een foto van hoe het nu is.</h2>
            <p className="mt-5 text-lg leading-relaxed text-navy-500">
              Vakmensen zien precies wat er moet gebeuren, dus je krijgt offertes die kloppen — zonder dat er eerst iemand langs hoeft om te kijken.
            </p>
            <Link href={user?.role === 'customer' ? '/klant/nieuw' : '/registreren'} className="btn-primary mt-8 px-6 py-3.5">Stuur je foto</Link>
          </div>
          <BeforeAfter examples={EXAMPLES.map((e) => ({ ...e, before: img(`voorbeeld/${e.key}-voor.jpg`), after: img(`voorbeeld/${e.key}-na.jpg`) }))} />
        </div>
      </section>

      {/* How it works */}
      <section id="hoe-het-werkt" className="mx-auto max-w-6xl px-6 py-24">
        <p className="eyebrow">Hoe het werkt</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-bold text-navy-900 sm:text-4xl">Van foto naar vakman, zonder formulieren.</h2>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {STEPS.map((s) => ({ ...s, d: wa ? s.d : s.d.replace('Via WhatsApp of de website.', 'Via de website (WhatsApp volgt binnenkort).') })).map((s) => (
            <div key={s.n} className="card group overflow-hidden transition hover:-translate-y-1 hover:shadow-lift">
              <Image {...img(s.image)} sizes="(min-width: 768px) 33vw, 100vw" className="aspect-[16/10] w-full object-cover" />
              <div className="p-7">
              <span className="font-display text-sm font-bold text-leaf-600">{s.n}</span>
              <h3 className="mt-4 text-xl font-bold text-navy-900">{s.t}</h3>
              <p className="mt-2 leading-relaxed text-navy-500">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* AI honesty */}
      <section className="bg-navy-900 py-24 text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-leaf-400">Eerlijke AI</p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Slim, maar nooit eigenwijs.</h2>
            <p className="mt-5 text-lg leading-relaxed text-navy-300">
              Onze assistent verzint geen maten of prijzen. Alles wat jij vertelt staat apart van wat de AI inschat, zodat jij én de vakman precies weten waar je aan toe bent. Niets wordt geplaatst zonder jouw bevestiging.
            </p>
          </div>
          <div className="space-y-3">
            {[
              ['Jouw invoer', 'Omvang: ongeveer 15 meter schutting', 'bg-white/10 text-white'],
              ['AI-inschatting', 'Categorie: schilderwerk — klopt dit?', 'bg-amber-400/15 text-amber-200'],
              ['Veiligheid', 'Gaslucht? Dan krijg je direct het storingsnummer, geen offerte-traject.', 'bg-red-400/15 text-red-200'],
            ].map(([k, v, cls]) => (
              <div key={k} className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
                <span className={`chip shrink-0 ${cls}`}>{k}</span>
                <p className="text-sm text-navy-200">{v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contractors */}
      <section id="vakmensen" className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="eyebrow">Voor vakmensen</p>
            <h2 className="mt-3 text-3xl font-bold text-navy-900 sm:text-4xl">Echte klussen, in jouw werkgebied.</h2>
            <p className="mt-5 text-lg leading-relaxed text-navy-500">
              Geen vage aanvragen. Elke klus is door de klant bevestigd, heeft een duidelijke omschrijving, foto’s en een budget-indicatie. Je ontvangt alleen klussen binnen jouw vakgebied en straal — en nooit een overvolle inbox.
            </p>
            <Link href="/voor-vakmensen" className="btn-dark mt-8 px-6 py-3">Meld je bedrijf aan</Link>
          </div>
          <div className="relative">
            <div className="overflow-hidden rounded-[2rem] shadow-lift">
              <Image {...img('hero/hero-vakman.jpg')} sizes="(min-width: 1024px) 560px, 100vw" className="aspect-[4/3] w-full object-cover" />
            </div>
            <ul className="absolute -bottom-6 left-4 right-4 grid gap-1.5 rounded-2xl bg-white p-4 text-sm shadow-lift sm:left-auto sm:w-72">
              {['Klussen met foto’s en budget', 'Alleen jouw vak en werkgebied', 'Max. aantal vakmensen per klus', 'Gratis tijdens de lancering'].map((t) => (
                <li key={t} className="flex items-center gap-2 text-navy-700"><span className="text-leaf-600">✓</span>{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section id="vertrouwen" className="bg-sand-100 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="eyebrow">Vertrouwen</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-bold text-navy-900 sm:text-4xl">Gebouwd op privacy en zekerheid.</h2>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              ['KvK-geverifieerd', 'Vakmensen worden gecontroleerd voordat ze offertes kunnen sturen.'],
              ['Privé tot jij kiest', 'Vakmensen zien alleen je regio. Adres en telefoon pas na acceptatie.'],
              ['Jij hebt de regie', 'Afmelden voor WhatsApp kan altijd met één woord: STOP.'],
            ].map(([t, d]) => (
              <div key={t} className="rounded-2xl bg-white p-7 shadow-card">
                <h3 className="text-lg font-bold text-navy-900">{t}</h3>
                <p className="mt-2 text-navy-500">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
