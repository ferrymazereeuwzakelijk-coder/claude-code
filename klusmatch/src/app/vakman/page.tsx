import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/guards';
import { AppShell } from '@/components/app-shell';
import { Badge, EmptyState, Notice, PageHeader, Stat, eur, km, relTime } from '@/components/ui';
import { sql } from '@/lib/db';
import { contractorFeed, getContractorProfile, type FeedFilters } from '@/lib/contractors';
import { listCategories } from '@/lib/categories';
import { toggleSaveJobAction } from '@/app/actions/contractor';
import { ShareCard } from '@/components/share-card';
import { referralLink, referralStats, whatsappShareLink } from '@/lib/growth';
import { listPortfolio } from '@/lib/portfolio';

export const metadata = { title: 'Klussen' };

type SP = { categorie?: string; afstand?: string; budget?: string; sort?: string; bewaard?: string };

export default async function ContractorFeedPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireRole('contractor');
  const db = sql();
  const profile = await getContractorProfile(db, user.id);
  if (!profile) redirect('/vakman/profiel');
  const sp = await searchParams;
  const filters: FeedFilters = {
    category: sp.categorie && profile.categories.includes(sp.categorie) ? sp.categorie : undefined,
    maxKm: sp.afstand ? Math.min(Number(sp.afstand) || 0, 200) || undefined : undefined,
    withBudget: sp.budget === '1',
    sort: sp.sort === 'afstand' ? 'closest' : 'newest',
    saved: sp.bewaard === '1',
  };
  const [jobs, categories] = await Promise.all([contractorFeed(db, user.id, filters), listCategories(db)]);
  const [stats] = await db<{ open: number; accepted: number; this_week: number }[]>`
    select count(*) filter (where status = 'submitted')::int as open,
           count(*) filter (where status = 'accepted')::int as accepted,
           count(*) filter (where created_at > now() - interval '7 days')::int as this_week
    from quotes where contractor_id = ${user.id}`;
  const mine = categories.filter((c) => profile.categories.includes(c.slug));
  const [refStats, portfolio] = await Promise.all([referralStats(db, user.id), listPortfolio(db, user.id)]);
  const checklist = [
    { done: true, label: 'Bedrijfsprofiel ingevuld', href: '/vakman/profiel' },
    { done: profile.verification === 'verified', label: 'KvK geverifieerd', href: '/vakman/profiel' },
    { done: profile.description.trim().length >= 40, label: 'Beschrijving van je bedrijf (vergroot je kans)', href: '/vakman/profiel' },
    { done: portfolio.length >= 3, label: `Minstens 3 portfoliofoto’s (${portfolio.length}/3)`, href: '/vakman/profiel' },
    { done: profile.whatsapp_alerts, label: 'Klussen direct via WhatsApp', href: '/vakman/profiel#whatsapp' },
  ];
  const todo = checklist.filter((c) => !c.done);
  const q = (patch: Partial<SP>) => {
    const p = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/vakman${p.toString() ? `?${p}` : ''}`;
  };

  return (
    <AppShell user={user}>
      <PageHeader eyebrow={profile.company_name} title="Klussen in jouw regio" description={`Binnen ${profile.service_radius_km} km van ${profile.base_postcode} in jouw vakgebieden.`} />

      {profile.verification !== 'verified' && (
        <div className="mb-6">
          <Notice tone="amber" title={profile.verification === 'rejected' ? 'Verificatie afgewezen' : 'Je account wordt geverifieerd'}>
            {profile.verification === 'rejected'
              ? 'Pas je bedrijfsgegevens aan in je profiel om opnieuw verificatie aan te vragen.'
              : 'Je kunt klussen al bekijken. Offertes versturen kan zodra we je KvK-inschrijving hebben gecontroleerd. Je ontvangt nog geen meldingen van nieuwe klussen.'}
          </Notice>
        </div>
      )}

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        {todo.length > 0 && (
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-navy-900">Maak je profiel sterker</p>
              <span className="text-sm text-navy-400">{checklist.length - todo.length}/{checklist.length}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-navy-50"><div className="h-1.5 rounded-full bg-leaf-500" style={{ width: `${((checklist.length - todo.length) / checklist.length) * 100}%` }} /></div>
            <ul className="mt-4 space-y-2 text-sm">
              {checklist.map((c) => (
                <li key={c.label} className="flex items-center gap-2.5">
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] ${c.done ? 'bg-leaf-500 text-white' : 'border border-navy-200 text-transparent'}`}>✓</span>
                  {c.done ? <span className="text-navy-400 line-through">{c.label}</span> : <Link href={c.href} className="text-navy-800 hover:text-leaf-700 hover:underline">{c.label}</Link>}
                </li>
              ))}
            </ul>
          </div>
        )}
        {profile.referral_code && (
          <ShareCard link={referralLink(profile.referral_code)} whatsappHref={whatsappShareLink(profile.referral_code)} signedUp={refStats.signed_up} verified={refStats.verified} foundingNo={profile.founding_member_no} />
        )}
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat label="Beschikbaar" value={jobs.length} hint="klussen in je feed" />
        <Stat label="Open offertes" value={stats.open} />
        <Stat label="Geaccepteerd" value={stats.accepted} />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Link href={q({ categorie: undefined })} className={`chip px-3 py-1.5 text-sm ${!filters.category ? 'bg-navy-900 text-white' : 'bg-white text-navy-600 ring-1 ring-navy-200 hover:ring-navy-300'}`}>Alle vakgebieden</Link>
        {mine.map((c) => (
          <Link key={c.slug} href={q({ categorie: c.slug })} className={`chip px-3 py-1.5 text-sm ${filters.category === c.slug ? 'bg-navy-900 text-white' : 'bg-white text-navy-600 ring-1 ring-navy-200 hover:ring-navy-300'}`}>{c.name}</Link>
        ))}
        <span className="mx-1 hidden h-5 w-px bg-navy-200 sm:block" />
        {[10, 25].map((km) => (
          <Link key={km} href={q({ afstand: sp.afstand === String(km) ? undefined : String(km) })} className={`chip px-3 py-1.5 text-sm ${sp.afstand === String(km) ? 'bg-leaf-600 text-white' : 'bg-white text-navy-600 ring-1 ring-navy-200'}`}>≤ {km} km</Link>
        ))}
        <Link href={q({ budget: sp.budget === '1' ? undefined : '1' })} className={`chip px-3 py-1.5 text-sm ${filters.withBudget ? 'bg-leaf-600 text-white' : 'bg-white text-navy-600 ring-1 ring-navy-200'}`}>Met budget</Link>
        <Link href={q({ bewaard: sp.bewaard === '1' ? undefined : '1' })} className={`chip px-3 py-1.5 text-sm ${filters.saved ? 'bg-leaf-600 text-white' : 'bg-white text-navy-600 ring-1 ring-navy-200'}`}>★ Bewaard</Link>
        <Link href={q({ sort: sp.sort === 'afstand' ? undefined : 'afstand' })} className="ml-auto text-sm font-medium text-navy-500 hover:text-navy-900">
          Sorteer: {filters.sort === 'closest' ? 'dichtstbij' : 'nieuwste'} ⇅
        </Link>
      </div>

      {jobs.length === 0 ? (
        <EmptyState title="Geen klussen gevonden">
          Er zijn op dit moment geen open klussen die passen bij je filters. Nieuwe klussen in je regio verschijnen hier automatisch.
        </EmptyState>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {jobs.map((j) => (
            <article key={j.id} className="card group relative flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge>{j.category_name}</Badge>
                  {j.timing.startsWith('Zo snel') && <Badge tone="red">Spoed</Badge>}
                  {j.my_quote_status && <Badge tone="blue">Offerte {j.my_quote_status === 'accepted' ? 'geaccepteerd' : 'verstuurd'}</Badge>}
                </div>
                <form action={toggleSaveJobAction}>
                  <input type="hidden" name="jobId" value={j.id} />
                  <button className={`relative z-10 text-lg leading-none transition ${j.saved ? 'text-amber-500' : 'text-navy-200 hover:text-amber-400'}`} aria-label={j.saved ? 'Verwijder uit bewaard' : 'Bewaar klus'} title="Bewaren">★</button>
                </form>
              </div>
              <Link href={`/vakman/klussen/${j.id}`} className="mt-3 font-semibold leading-snug text-navy-900 after:absolute after:inset-0 group-hover:text-leaf-800">{j.title}</Link>
              <div className="mt-auto grid grid-cols-3 gap-2 pt-5 text-xs text-navy-500">
                <div><p className="text-navy-400">Afstand</p><p className="font-semibold text-navy-900">{km(j.distance_km)}</p></div>
                <div><p className="text-navy-400">Budget</p><p className="font-semibold text-navy-900">{j.budget_max_cents ? `≤ ${eur(j.budget_max_cents)}` : 'Open'}</p></div>
                <div><p className="text-navy-400">Offertes</p><p className="font-semibold text-navy-900">{j.quote_count}</p></div>
              </div>
              <p className="mt-3 text-xs text-navy-400">{j.region_name} · {j.timing} · {relTime(j.published_at)}{j.photo_count ? ` · ${j.photo_count} foto${j.photo_count > 1 ? "'s" : ''}` : ''}</p>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}
