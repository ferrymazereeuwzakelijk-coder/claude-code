import Link from 'next/link';
import { currentUser } from '@/lib/auth/session';
import { homeFor } from '@/lib/auth/guards';
import { Logo } from '@/components/ui';
import { SiteFooter } from '@/components/site-footer';

const STEPS = [
  { n: '01', t: 'Stuur een foto', d: 'Via WhatsApp of de website. Vertel in je eigen woorden wat er moet gebeuren.' },
  { n: '02', t: 'AI maakt de opdracht', d: 'Een paar korte vragen, daarna een heldere omschrijving. Jij controleert en bevestigt.' },
  { n: '03', t: 'Vergelijk offertes', d: 'Geverifieerde vakmensen uit je regio reageren. Jij kiest — ook gewoon in WhatsApp.' },
];

const CATEGORIES = ['Schilderwerk', 'Tuinonderhoud', 'Bestrating', 'Loodgieter', 'Dakwerk', 'Elektra', 'Timmerwerk', 'Badkamer', 'CV & verwarming', 'Stukadoor'];

export default async function Home() {
  const user = await currentUser();
  return (
    <div className="overflow-x-hidden">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex h-20 max-w-6xl items-center gap-8 px-6">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm font-medium text-navy-600 md:flex">
            <a href="#hoe-het-werkt" className="hover:text-navy-900">Hoe het werkt</a>
            <a href="#vakmensen" className="hover:text-navy-900">Voor vakmensen</a>
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
              <span className="h-1.5 w-1.5 rounded-full bg-leaf-500" /> Nieuw: klussen regelen via WhatsApp
            </span>
            <h1 className="mt-6 text-[42px] font-extrabold leading-[1.05] text-navy-900 sm:text-6xl">
              Je klus geregeld.<br />
              <span className="bg-gradient-to-r from-leaf-600 to-leaf-500 bg-clip-text text-transparent">Gewoon via WhatsApp.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-navy-500">
              Stuur een foto van wat er moet gebeuren. Onze assistent stelt een paar slimme vragen, schrijft een duidelijke opdracht en zet hem — na jouw akkoord — uit bij geverifieerde vakmensen bij jou in de buurt.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href={user?.role === 'customer' ? '/klant/nieuw' : '/registreren'} className="btn-primary px-6 py-3.5 text-base">Plaats je klus gratis</Link>
              <Link href="/registreren?rol=vakman" className="btn-secondary px-6 py-3.5 text-base">Ik ben vakman</Link>
            </div>
            <p className="mt-5 text-sm text-navy-400">Geen verplichtingen · Je adres blijft privé tot jij een offerte kiest</p>
          </div>

          {/* Product visual (illustrative) */}
          <div className="relative mx-auto w-full max-w-sm animate-fade-up [animation-delay:120ms]" aria-hidden>
            <div className="absolute -left-10 top-16 hidden w-52 rotate-[-4deg] rounded-2xl border border-navy-100 bg-white p-4 shadow-lift sm:block">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-leaf-700">Nieuwe offerte</p>
              <p className="mt-1 text-sm font-semibold text-navy-900">Schildersbedrijf</p>
              <p className="font-display text-2xl font-bold text-navy-900">€ 850</p>
              <p className="text-xs text-navy-400">Vaste prijs · 12 km</p>
            </div>
            <div className="overflow-hidden rounded-[2.2rem] border-[9px] border-navy-900 bg-navy-900 shadow-lift">
              <div className="flex items-center gap-2.5 bg-[#075E54] px-4 py-3 text-white">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-[10px] font-black text-navy-900">KM</span>
                <div><p className="text-sm font-semibold">KlusMatch</p><p className="text-[10px] text-white/70">online</p></div>
              </div>
              <div className="space-y-2 bg-[#ECE5DD] p-3 text-[12.5px] leading-snug">
                <div className="ml-auto w-fit max-w-[80%] rounded-lg rounded-tr-none bg-[#DCF8C6] p-1.5 shadow-sm">
                  <div className="h-28 w-44 rounded-md bg-[linear-gradient(135deg,#8B6B4A_0%,#A98863_40%,#7A5C3D_41%,#9C7B57_100%)]" />
                  <p className="px-1 pt-1 text-navy-900">Schutting moet geschilderd worden</p>
                </div>
                <div className="w-fit max-w-[85%] rounded-lg rounded-tl-none bg-white px-2.5 py-1.5 text-navy-900 shadow-sm">Ik zie een houten schutting met afbladderende verf. Hoe lang is hij ongeveer?</div>
                <div className="ml-auto w-fit rounded-lg rounded-tr-none bg-[#DCF8C6] px-2.5 py-1.5 text-navy-900 shadow-sm">Zo’n 15 meter</div>
                <div className="w-fit max-w-[85%] rounded-lg rounded-tl-none bg-white px-2.5 py-1.5 text-navy-900 shadow-sm">Top! Wat is je postcode? Je adres blijft privé 🔒</div>
                <div className="ml-auto w-fit rounded-lg rounded-tr-none bg-[#DCF8C6] px-2.5 py-1.5 text-navy-900 shadow-sm">3512 AB</div>
                <div className="w-fit max-w-[85%] rounded-lg rounded-tl-none bg-white px-2.5 py-1.5 text-navy-900 shadow-sm">Hier is je klusomschrijving. Klopt alles? Antwoord <b>JA</b> om te plaatsen.</div>
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-navy-400">Illustratie van de WhatsApp-flow</p>
          </div>
        </div>
      </section>

      {/* Categories marquee */}
      <section className="border-y border-navy-100 bg-white py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-x-8 gap-y-2 px-6 text-sm font-medium text-navy-400">
          {CATEGORIES.map((c) => <span key={c}>{c}</span>)}
        </div>
      </section>

      {/* How it works */}
      <section id="hoe-het-werkt" className="mx-auto max-w-6xl px-6 py-24">
        <p className="eyebrow">Hoe het werkt</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-bold text-navy-900 sm:text-4xl">Van foto naar vakman, zonder formulieren.</h2>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="card group p-7 transition hover:-translate-y-1 hover:shadow-lift">
              <span className="font-display text-sm font-bold text-leaf-600">{s.n}</span>
              <h3 className="mt-4 text-xl font-bold text-navy-900">{s.t}</h3>
              <p className="mt-2 leading-relaxed text-navy-500">{s.d}</p>
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
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <p className="eyebrow">Voor vakmensen</p>
            <h2 className="mt-3 text-3xl font-bold text-navy-900 sm:text-4xl">Echte klussen, in jouw werkgebied.</h2>
            <p className="mt-5 text-lg leading-relaxed text-navy-500">
              Geen vage aanvragen. Elke klus is door de klant bevestigd, heeft een duidelijke omschrijving, foto’s en een budget-indicatie. Je ontvangt alleen klussen binnen jouw vakgebied en straal — en nooit een overvolle inbox.
            </p>
            <Link href="/registreren?rol=vakman" className="btn-dark mt-8 px-6 py-3">Meld je bedrijf aan</Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              ['Slimme matching', 'Op vakgebied, afstand, beschikbaarheid en verificatie.'],
              ['Rustige meldingen', 'Een dagelijks maximum voorkomt spam.'],
              ['Filters & bewaren', 'Filter op afstand en budget, bewaar klussen voor later.'],
              ['Direct contact', 'Na acceptatie krijg je meteen de gegevens van de klant.'],
            ].map(([t, d]) => (
              <li key={t} className="card p-5">
                <p className="font-semibold text-navy-900">{t}</p>
                <p className="mt-1 text-sm text-navy-500">{d}</p>
              </li>
            ))}
          </ul>
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
