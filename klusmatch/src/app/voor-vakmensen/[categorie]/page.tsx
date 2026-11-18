import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { sql } from '@/lib/db';
import { listCategories } from '@/lib/categories';
import { foundingStats, openJobsTeaser } from '@/lib/growth';
import { CITIES, TRADE } from '@/lib/seo';
import { Badge, Logo, eur, relTime } from '@/components/ui';
import { SiteFooter } from '@/components/site-footer';
import Image from 'next/image';
import { tradeImage } from '@/lib/images';

export const revalidate = 600;

async function load(slug: string) {
  const category = (await listCategories(sql())).find((c) => c.slug === slug);
  return category ? { category, trade: TRADE[slug] } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ categorie: string }> }): Promise<Metadata> {
  const d = await load((await params).categorie);
  if (!d) return {};
  const pro = d.trade?.pro ?? 'vakman';
  return {
    title: `Klussen voor ${pro}s — gratis aanmelden`,
    description: `Ben je ${pro}? Ontvang echte klussen (${d.category.name.toLowerCase()}) uit je eigen regio, met foto’s en budget. Geen leadkosten tijdens de lancering.`,
  };
}

export default async function TradeForPros({ params, searchParams }: { params: Promise<{ categorie: string }>; searchParams: Promise<{ ref?: string }> }) {
  const { categorie } = await params;
  const { ref } = await searchParams;
  const d = await load(categorie);
  if (!d) notFound();
  const { category, trade } = d;
  const pro = trade?.pro ?? 'vakman';
  const [jobs, founding] = await Promise.all([openJobsTeaser(sql(), { category: categorie, limit: 4 }), foundingStats()]);
  const signup = `/registreren?rol=vakman${ref && /^[A-Za-z0-9]{6,12}$/.test(ref) ? `&ref=${ref.toUpperCase()}` : ''}`;

  return (
    <div className="bg-white">
      <header className="border-b border-navy-100">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-6">
          <Logo />
          <Link href={signup} className="btn-primary ml-auto">Gratis aanmelden</Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-14">
        <p className="eyebrow">Voor {pro}s</p>
        <h1 className="mt-3 text-3xl font-extrabold text-navy-900 sm:text-5xl">Meer {category.name.toLowerCase()}-klussen, zonder leadkosten.</h1>
        <p className="mt-5 max-w-2xl text-lg text-navy-500">
          Klanten beschrijven hun klus met foto’s, postcode en budget, en bevestigen hem zelf. Jij ziet alleen klussen in jouw vakgebied
          en binnen je eigen werkstraal — en kiest zelf waarop je reageert.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link href={signup} className="btn-primary px-6 py-3.5 text-base">Meld je aan als {pro}</Link>
          {founding.left > 0 && <span className="text-sm text-amber-700">★ Nog {founding.left} founding-member-plekken</span>}
        </div>

        {tradeImage(categorie) && (
          <div className="mt-10 overflow-hidden rounded-3xl shadow-lift">
            <Image {...tradeImage(categorie)!} priority sizes="(min-width: 1024px) 1024px, 100vw" className="aspect-[21/9] w-full object-cover" />
          </div>
        )}
        {trade && (
          <section className="mt-12">
            <h2 className="text-lg font-bold text-navy-900">Typische klussen die je kunt verwachten</h2>
            <ul className="mt-3 grid gap-2 text-navy-600 sm:grid-cols-2">{trade.jobs.map((j) => <li key={j}>✓ {j}</li>)}</ul>
          </section>
        )}

        {jobs.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-bold text-navy-900">Nu open</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {jobs.map((j) => (
                <div key={j.id} className="card p-4">
                  <div className="flex items-center gap-2"><Badge>{j.category}</Badge><span className="text-xs text-navy-400">{j.region_name} · {relTime(j.published_at)}</span></div>
                  <p className="mt-2 font-semibold text-navy-900">{j.title}</p>
                  <p className="mt-1 text-sm text-navy-500">Budget {j.budget_max_cents ? `tot ${eur(j.budget_max_cents)}` : 'in overleg'}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm text-navy-400">Meld je aan om foto’s en details te zien en een offerte te sturen.</p>
          </section>
        )}

        <div className="mt-12"><Link href="/voor-vakmensen" className="text-sm font-semibold text-leaf-700 hover:underline">Alles over KlusMatch voor vakmensen →</Link></div>

        <nav className="mt-12 text-sm text-navy-400" aria-label="Klussen per stad">
          {category.name} per stad:{' '}
          {CITIES.map((c, i) => (
            <span key={c.slug}><Link href={`/klus/${categorie}/${c.slug}`} className="text-navy-600 hover:underline">{c.name}</Link>{i < CITIES.length - 1 ? ' · ' : ''}</span>
          ))}
        </nav>
      </main>
      <SiteFooter />
    </div>
  );
}
