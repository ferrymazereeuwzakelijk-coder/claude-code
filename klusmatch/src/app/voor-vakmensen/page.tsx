import Link from 'next/link';
import type { Metadata } from 'next';
import { sql } from '@/lib/db';
import { currentUser } from '@/lib/auth/session';
import { homeFor } from '@/lib/auth/guards';
import { foundingStats, openJobsTeaser } from '@/lib/growth';
import { getMatchingRules } from '@/lib/jobs/matching';
import { listCategories } from '@/lib/categories';
import { Badge, Logo, eur, relTime } from '@/components/ui';
import { SiteFooter } from '@/components/site-footer';
import { isWhatsAppEnabled } from '@/lib/env';

export const metadata: Metadata = {
  title: 'Voor vakmensen — gratis klussen in jouw regio',
  description: 'Echte klussen met foto’s, postcode en budget, door de klant bevestigd. Alleen in jouw vakgebied en werkgebied. Gratis aanmelden in 2 minuten.',
  openGraph: { title: 'Klussen uit jouw buurt, gratis — KlusMatch voor vakmensen', description: 'Echte klussen met foto’s en budget. Geen leadkosten tijdens de lancering.' },
};
export const dynamic = 'force-dynamic';

export default async function ForContractors({ searchParams }: { searchParams: Promise<{ ref?: string; uitnodiging?: string }> }) {
  const { ref, uitnodiging } = await searchParams;
  const db = sql();
  const [user, jobs, founding, rules, categories] = await Promise.all([currentUser(), openJobsTeaser(db, { limit: 6 }), foundingStats(db), getMatchingRules(db), listCategories(db)]);
  const wa = isWhatsAppEnabled();
  const params = new URLSearchParams({ rol: 'vakman' });
  if (ref && /^[A-Za-z0-9]{6,12}$/.test(ref)) params.set('ref', ref.toUpperCase());
  if (uitnodiging && /^[A-Za-z0-9]{6,12}$/.test(uitnodiging)) params.set('uitnodiging', uitnodiging.toUpperCase());
  const signup = `/registreren?${params}`;
  const cta = user ? homeFor(user.role) : signup;

  const faq: [string, string][] = [
    ['Wat kost het?', 'Aanmelden, klussen bekijken en offertes sturen is gratis tijdens de lancering. Gaan we later betaalde abonnementen aanbieden, dan hoor je dat ruim van tevoren en kies je zelf of je meedoet.'],
    ['Hoeveel vakmensen krijgen dezelfde klus?', `Maximaal ${rules.max_contractors_per_job}, en de dichtstbijzijnde eerst. Geen klus die naar een hele provincie wordt gestuurd.`],
    ['Krijg ik ook klussen buiten mijn vak of regio?', 'Nee. Je kiest zelf je vakgebieden en je werkstraal. Je ziet alleen wat daarbinnen valt.'],
    ['Wat weet ik van een klus voordat ik reageer?', 'Een duidelijke omschrijving, foto’s, de regio, de gewenste planning en het maximale budget van de klant. Elke klus is door de klant zelf bevestigd.'],
    ['Wanneer krijg ik de gegevens van de klant?', 'Zodra de klant jouw offerte accepteert, zie je naam, telefoonnummer en volledige postcode. Vóór die tijd kun je vragen stellen via berichten.'],
    ['Moet ik op elke klus reageren?', 'Nee. Je reageert alleen op klussen die je interessant vindt. Je kunt ook tijdelijk op “niet beschikbaar” zetten.'],
    ['Waarom vragen jullie mijn KvK-nummer?', 'We controleren elk bedrijf voordat het offertes kan sturen. Daardoor weten klanten dat ze met een echt bedrijf te maken hebben, en dat merk jij in je gunningskans.'],
  ];

  return (
    <div className="overflow-x-hidden bg-white">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex h-20 max-w-6xl items-center gap-6 px-6">
          <Logo light />
          <span className="hidden text-sm font-medium text-navy-300 sm:inline">voor vakmensen</span>
          <div className="ml-auto flex items-center gap-2">
            {!user && <Link href="/inloggen" className="btn hidden text-navy-100 hover:bg-white/10 sm:inline-flex">Inloggen</Link>}
            <Link href={cta} className="btn-primary">{user ? 'Naar dashboard' : 'Gratis aanmelden'}</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative bg-navy-900 pb-20 pt-32 text-white sm:pt-40">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_85%_10%,rgba(16,185,129,0.32),transparent_70%),radial-gradient(40%_50%_at_0%_100%,rgba(74,102,144,0.45),transparent_70%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="animate-fade-up">
            {founding.left > 0 && (
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-400/15 px-3 py-1 text-xs font-semibold text-amber-200 ring-1 ring-amber-300/30">
                ★ Nog {founding.left} van de {founding.limit} founding-member-plekken
              </span>
            )}
            <h1 className="mt-6 text-[40px] font-extrabold leading-[1.05] sm:text-6xl">
              Klussen uit jouw buurt.<br />
              <span className="text-leaf-400">Zonder leadkosten.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-navy-200">
              Echte klussen met foto’s, postcode en budget — door de klant zelf bevestigd. Alleen in jouw vakgebied en binnen jouw straal.
              {wa ? ' Nieuwe klussen krijg je direct via WhatsApp.' : ''} Aanmelden kost 2 minuten en is gratis tijdens de lancering.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href={cta} className="btn-primary px-7 py-4 text-base">{user ? 'Naar je dashboard' : 'Meld je gratis aan →'}</Link>
              <a href="#hoe-het-werkt" className="btn px-6 py-4 text-base text-white ring-1 ring-white/25 hover:bg-white/10">Hoe werkt het?</a>
            </div>
            <ul className="mt-8 grid gap-2 text-sm text-navy-200 sm:grid-cols-2">
              <li>✓ Geen abonnement, geen kosten per lead</li>
              <li>✓ Max. {rules.max_contractors_per_job} vakmensen per klus</li>
              <li>✓ Klantgegevens na acceptatie</li>
              <li>✓ Geen verplichtingen, altijd opzegbaar</li>
            </ul>
          </div>

          {/* Real open jobs (anonymised) */}
          <div className="animate-fade-up [animation-delay:120ms]">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-leaf-300">{jobs.length ? 'Nu open op KlusMatch' : 'Zo ziet een klus eruit'}</p>
            <div className="space-y-3">
              {jobs.length ? (
                jobs.slice(0, 3).map((j) => (
                  <div key={j.id} className="rounded-2xl bg-white p-4 text-navy-900 shadow-lift">
                    <div className="flex items-center gap-2">
                      <Badge>{j.category}</Badge>
                      <span className="text-xs text-navy-400">{j.region_name} · {relTime(j.published_at)}</span>
                    </div>
                    <p className="mt-2 line-clamp-2 font-semibold">{j.title}</p>
                    <p className="mt-2 text-sm text-navy-500">Budget: <strong className="text-navy-900">{j.budget_max_cents ? `tot ${eur(j.budget_max_cents)}` : 'in overleg'}</strong> · {j.quotes} offerte{j.quotes === 1 ? '' : 's'}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-white p-5 text-navy-900 shadow-lift">
                  <div className="flex items-center gap-2"><Badge>Schilderwerk</Badge><span className="text-xs text-navy-400">Voorbeeld</span></div>
                  <p className="mt-2 font-semibold">Houten schutting achtertuin schilderen, ± 15 meter</p>
                  <div className="mt-3 h-24 rounded-xl bg-[repeating-linear-gradient(90deg,#8B6B4A_0_22px,#5d4630_22px_26px)]" />
                  <p className="mt-3 text-sm text-navy-500">Utrecht (3512) · binnen een maand · budget tot <strong className="text-navy-900">€ 900</strong></p>
                  <p className="mt-1 text-xs text-navy-400">Voorbeeld van hoe een klus eruitziet. Echte klussen verschijnen hier zodra ze zijn geplaatst.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* How */}
      <section id="hoe-het-werkt" className="mx-auto max-w-6xl px-6 py-20">
        <p className="eyebrow">Hoe het werkt</p>
        <h2 className="mt-3 text-3xl font-bold text-navy-900 sm:text-4xl">Van aanmelding naar je eerste klus.</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            ['01', 'Meld je aan', 'Bedrijfsnaam, KvK-nummer, vakgebieden en hoe ver je wilt rijden. Twee minuten werk.'],
            ['02', 'Wij controleren je KvK', 'Zodra je geverifieerd bent, krijg je het groene vinkje en kun je offertes sturen.'],
            ['03', 'Kies je klussen', `Nieuwe klussen in jouw straal${wa ? ' komen direct binnen via WhatsApp' : ' verschijnen meteen in je overzicht'}. Interessant? Stuur een offerte. Zo niet, laat je hem liggen.`],
          ].map(([n, t, d]) => (
            <div key={n} className="card p-7">
              <span className="font-display text-sm font-bold text-leaf-600">{n}</span>
              <h3 className="mt-4 text-xl font-bold text-navy-900">{t}</h3>
              <p className="mt-2 leading-relaxed text-navy-500">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why better */}
      <section className="bg-sand-100 py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-2">
          <div>
            <p className="eyebrow">Waarom KlusMatch</p>
            <h2 className="mt-3 text-3xl font-bold text-navy-900 sm:text-4xl">Betere aanvragen. Minder concurrentie per klus.</h2>
            <p className="mt-5 text-lg leading-relaxed text-navy-500">
              Klanten beschrijven hun klus samen met onze assistent: wat er moet gebeuren, hoe groot het is, wanneer en voor welk budget.
              Ze bevestigen de opdracht zelf voordat jij hem ziet. Jij verspilt geen tijd aan vage aanvragen of klanten die alleen prijzen vergelijken.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['Foto’s en budget vooraf', 'Je weet waar je aan begint voordat je reageert.'],
              ['Alleen jouw vak en regio', 'Je kiest zelf je vakgebieden en werkstraal.'],
              [`Max. ${rules.max_contractors_per_job} per klus`, 'Dichtstbijzijnde vakmensen eerst. Geen veiling.'],
              ['Reviews van echte klanten', 'Alleen klanten van afgeronde klussen kunnen een review schrijven.'],
              ['Portfolio op je profiel', 'Laat met foto’s zien wat je kunt.'],
              ['Geverifieerd-badge', 'Klanten zien dat je bedrijf is gecontroleerd.'],
            ].map(([t, d]) => (
              <div key={t} className="rounded-2xl bg-white p-5 shadow-card">
                <p className="font-semibold text-navy-900">{t}</p>
                <p className="mt-1 text-sm text-navy-500">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Founding members */}
      {founding.left > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="overflow-hidden rounded-3xl bg-navy-900 p-8 text-white sm:p-12">
            <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-300">Founding members</p>
                <h2 className="mt-3 text-3xl font-bold">Word een van de eerste {founding.limit}.</h2>
                <p className="mt-4 max-w-xl text-navy-200">
                  De eerste {founding.limit} geverifieerde bedrijven krijgen een vast founding-member-nummer en een badge op hun profiel en offertes —
                  zichtbaar voor elke klant. Die plek blijft van jou.
                </p>
              </div>
              <div className="text-center">
                <p className="font-display text-6xl font-extrabold text-amber-300">{founding.left}</p>
                <p className="text-sm text-navy-300">plekken over</p>
                <div className="mx-auto mt-3 h-2 w-48 overflow-hidden rounded-full bg-white/10">
                  <div className="h-2 rounded-full bg-amber-300" style={{ width: `${Math.round((founding.taken / founding.limit) * 100)}%` }} />
                </div>
                <Link href={cta} className="btn-primary mt-6 px-6 py-3">Claim je plek →</Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Trades */}
      <section className="mx-auto max-w-6xl px-6 pb-12">
        <p className="text-sm text-navy-400">Vakgebieden:{' '}
          {categories.map((c, i) => (
            <span key={c.slug}>
              <Link href={`/voor-vakmensen/${c.slug}`} className="text-navy-600 hover:underline">{c.name}</Link>{i < categories.length - 1 ? ' · ' : ''}
            </span>
          ))}
        </p>
      </section>

      {/* FAQ */}
      <section className="bg-sand-50 py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-3xl font-bold text-navy-900">Veelgestelde vragen</h2>
          <div className="mt-8 divide-y divide-navy-100 rounded-2xl bg-white shadow-card">
            {faq.map(([q, a]) => (
              <details key={q} className="group p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-navy-900">
                  {q}<span className="ml-4 text-navy-300 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 leading-relaxed text-navy-600">{a}</p>
              </details>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link href={cta} className="btn-primary px-8 py-4 text-base">{user ? 'Naar je dashboard' : 'Meld je gratis aan — 2 minuten'}</Link>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
