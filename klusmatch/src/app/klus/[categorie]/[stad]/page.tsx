import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { sql } from '@/lib/db';
import { listCategories } from '@/lib/categories';
import { CITIES, cityBySlug, TRADE } from '@/lib/seo';
import { isWhatsAppEnabled } from '@/lib/env';
import { Logo } from '@/components/ui';
import { SiteFooter } from '@/components/site-footer';

export const revalidate = 3600;

async function load(categorie: string, stad: string) {
  const city = cityBySlug(stad);
  const category = (await listCategories(sql())).find((c) => c.slug === categorie);
  if (!city || !category) return null;
  const [r] = await sql()<{ pros: number }[]>`
    select count(*)::int as pros from contractor_profiles cp
    join contractor_categories cc on cc.contractor_id = cp.user_id and cc.category_slug = ${categorie}
    where cp.verification = 'verified' and cp.available
      and km_distance(cp.base_lat, cp.base_lng, ${city.lat}, ${city.lng}) <= cp.service_radius_km`;
  return { city, category, pros: r.pros, trade: TRADE[categorie] };
}

export async function generateMetadata({ params }: { params: Promise<{ categorie: string; stad: string }> }): Promise<Metadata> {
  const { categorie, stad } = await params;
  const d = await load(categorie, stad);
  if (!d) return {};
  const pro = d.trade?.pro ?? 'vakman';
  return {
    title: `${pro.charAt(0).toUpperCase() + pro.slice(1)} in ${d.city.name} — gratis offertes`,
    description: `${d.category.name} in ${d.city.name}? Stuur een foto en beschrijving, en ontvang gratis offertes van geverifieerde ${pro}s uit de buurt.`,
    alternates: { canonical: `/klus/${categorie}/${stad}` },
  };
}

export default async function CityTradePage({ params }: { params: Promise<{ categorie: string; stad: string }> }) {
  const { categorie, stad } = await params;
  const d = await load(categorie, stad);
  if (!d) notFound();
  const { city, category, pros, trade } = d;
  const pro = trade?.pro ?? 'vakman';
  const wa = isWhatsAppEnabled();
  const nearby = CITIES.filter((c) => c.slug !== stad).slice(0, 8);

  return (
    <div className="bg-white">
      <header className="border-b border-navy-100">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-6">
          <Logo />
          <Link href="/registreren" className="btn-primary ml-auto">Klus plaatsen</Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-14">
        <p className="eyebrow">{category.name} · {city.name}</p>
        <h1 className="mt-3 text-3xl font-extrabold text-navy-900 sm:text-5xl">{pro.charAt(0).toUpperCase() + pro.slice(1)} nodig in {city.name}?</h1>
        <p className="mt-5 max-w-2xl text-lg text-navy-500">
          Beschrijf je klus in je eigen woorden en stuur een foto mee{wa ? ' — via de website of gewoon via WhatsApp' : ''}. Onze assistent maakt er
          een duidelijke opdracht van, en geverifieerde {pro}s uit de buurt van {city.name} sturen je een offerte. Gratis en vrijblijvend.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link href="/registreren" className="btn-primary px-6 py-3.5 text-base">Plaats je klus gratis</Link>
          {pros > 0 && <span className="text-sm text-navy-500"><strong className="text-navy-900">{pros}</strong> geverifieerde {pro}{pros === 1 ? '' : 's'} werkzaam in {city.name} en omgeving</span>}
        </div>

        {trade && (
          <section className="mt-14 grid gap-8 md:grid-cols-2">
            <div className="card p-6">
              <h2 className="text-lg font-bold text-navy-900">Veelgevraagde klussen</h2>
              <ul className="mt-3 space-y-2 text-navy-600">{trade.jobs.map((j) => <li key={j}>✓ {j}</li>)}</ul>
            </div>
            <div className="card p-6">
              <h2 className="text-lg font-bold text-navy-900">Tip voor een snelle offerte</h2>
              <p className="mt-3 text-navy-600">{trade.tip}</p>
              <p className="mt-3 text-sm text-navy-400">Je adres en telefoonnummer worden pas gedeeld met de vakman wiens offerte je accepteert.</p>
            </div>
          </section>
        )}

        <section className="mt-14">
          <h2 className="text-lg font-bold text-navy-900">Zo werkt het</h2>
          <ol className="mt-4 grid gap-4 sm:grid-cols-3">
            {['Beschrijf je klus en stuur een foto', 'Controleer en bevestig de omschrijving', `Vergelijk offertes van ${pro}s en kies`].map((s, i) => (
              <li key={s} className="rounded-2xl bg-sand-50 p-5"><span className="font-display font-bold text-leaf-600">0{i + 1}</span><p className="mt-2 font-medium text-navy-900">{s}</p></li>
            ))}
          </ol>
        </section>

        <section className="mt-14 rounded-2xl bg-navy-900 p-6 text-white">
          <p className="font-semibold">Ben je zelf {pro} in {city.name}?</p>
          <p className="mt-1 text-sm text-navy-200">Ontvang klussen uit jouw regio, met foto’s en budget. Gratis aanmelden.</p>
          <Link href={`/voor-vakmensen/${categorie}`} className="btn mt-4 bg-white text-navy-900 hover:bg-leaf-50">Meer voor {pro}s →</Link>
        </section>

        <nav className="mt-14 text-sm text-navy-400" aria-label="Andere steden">
          {category.name} in:{' '}
          {nearby.map((c, i) => (
            <span key={c.slug}><Link href={`/klus/${categorie}/${c.slug}`} className="text-navy-600 hover:underline">{c.name}</Link>{i < nearby.length - 1 ? ' · ' : ''}</span>
          ))}
        </nav>
      </main>
      <SiteFooter />
    </div>
  );
}
