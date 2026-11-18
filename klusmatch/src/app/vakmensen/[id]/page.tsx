import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { sql } from '@/lib/db';
import { currentUser } from '@/lib/auth/session';
import { homeFor } from '@/lib/auth/guards';
import { Badge, Logo, VerifiedBadge } from '@/components/ui';
import { Stars } from '@/components/lifecycle';
import { listPortfolio } from '@/lib/portfolio';
import { parsePostcode } from '@/lib/geo';
import { ratingsFor, reviewsForContractor } from '@/lib/reviews';

type Profile = { founding_member_no: number | null; user_id: string; company_name: string; description: string; base_postcode: string; service_radius_km: number; verification: string; created_at: Date; categories: string[]; completed: number };

async function load(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [p] = await sql()<Profile[]>`
    select cp.founding_member_no, cp.user_id, cp.company_name, cp.description, cp.base_postcode, cp.service_radius_km, cp.verification, cp.created_at,
           array(select c.name_nl from contractor_categories cc join categories c on c.slug = cc.category_slug where cc.contractor_id = cp.user_id order by c.sort_order) as categories,
           (select count(*)::int from quotes q join jobs j on j.id = q.job_id where q.contractor_id = cp.user_id and q.status = 'accepted' and j.status = 'completed') as completed
    from contractor_profiles cp join users u on u.id = cp.user_id
    where cp.user_id = ${id} and u.status = 'active'`;
  return p ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const p = await load((await params).id);
  return { title: p ? p.company_name : 'Vakman' };
}

/** Public contractor profile. Only verified businesses are listed; it never shows contact details. */
export default async function ContractorProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [profile, viewer] = await Promise.all([load(id), currentUser()]);
  const isOwnerOrAdmin = viewer && (viewer.id === id || viewer.role === 'admin');
  if (!profile || (profile.verification !== 'verified' && !isOwnerOrAdmin)) notFound();
  const db = sql();
  const [portfolio, reviews, ratings] = await Promise.all([listPortfolio(db, id), reviewsForContractor(db, id), ratingsFor(db, [id])]);
  const rating = ratings.get(id);
  const region = parsePostcode(profile.base_postcode)?.region ?? profile.base_postcode;
  const initials = profile.company_name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="min-h-screen bg-sand-50">
      <header className="border-b border-navy-100 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-6">
          <Logo />
          <Link href={viewer ? homeFor(viewer.role) : '/registreren'} className="btn-secondary ml-auto text-sm">{viewer ? 'Naar dashboard' : 'Plaats een klus'}</Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">
        {profile.verification !== 'verified' && (
          <p className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Voorbeeldweergave: dit profiel is pas openbaar zichtbaar na verificatie.</p>
        )}
        <section className="card overflow-hidden">
          <div className="h-24 bg-[radial-gradient(60%_120%_at_80%_0%,rgba(16,185,129,0.35),transparent),linear-gradient(135deg,#0B1B33,#1E3A63)]" />
          <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-end sm:p-8">
            <div className="-mt-16 grid h-20 w-20 shrink-0 place-items-center rounded-2xl border-4 border-white bg-navy-900 font-display text-2xl font-bold text-white shadow-lift">{initials}</div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-navy-900">{profile.company_name}</h1>
                {profile.verification === 'verified' && <VerifiedBadge />}
                {profile.founding_member_no && <Badge tone="amber">★ Founding Member #{profile.founding_member_no}</Badge>}
              </div>
              <p className="mt-1 text-sm text-navy-500">Werkt binnen {profile.service_radius_km} km van {region} · actief sinds {new Date(profile.created_at).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">{profile.categories.map((c) => <Badge key={c}>{c}</Badge>)}</div>
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <p className="font-display text-2xl font-bold text-navy-900">{rating ? rating.avg?.toFixed(1) : '—'}</p>
                <p className="text-xs text-navy-400">{rating ? `${rating.count} review${rating.count === 1 ? '' : 's'}` : 'Nog geen reviews'}</p>
              </div>
              <div>
                <p className="font-display text-2xl font-bold text-navy-900">{profile.completed}</p>
                <p className="text-xs text-navy-400">klussen afgerond</p>
              </div>
            </div>
          </div>
          {profile.description && <p className="whitespace-pre-line border-t border-navy-100 px-6 py-5 text-[15px] leading-relaxed text-navy-700 sm:px-8">{profile.description}</p>}
        </section>

        <section className="mt-8">
          <h2 className="mb-4 text-lg font-bold text-navy-900">Portfolio</h2>
          {portfolio.length === 0 ? (
            <p className="text-sm text-navy-400">Nog geen projecten toegevoegd.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {portfolio.map((p) => (
                <figure key={p.id} className="group overflow-hidden rounded-2xl bg-white shadow-card">
                  <img src={`/api/media/${p.media_id}`} alt={p.caption || 'Portfolio-foto'} className="aspect-square w-full object-cover transition duration-300 group-hover:scale-[1.03]" loading="lazy" />
                  {(p.caption || p.category) && (
                    <figcaption className="px-3 py-2 text-xs text-navy-600">
                      {p.caption}
                      {p.category && <span className="block text-navy-400">{p.category}</span>}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          )}
        </section>

        <section className="mt-10">
          <h2 className="mb-4 text-lg font-bold text-navy-900">Reviews van klanten</h2>
          {reviews.length === 0 ? (
            <p className="text-sm text-navy-400">Nog geen reviews. Reviews kunnen alleen worden geschreven door klanten van afgeronde klussen via KlusMatch.</p>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <article key={r.id} className="card p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Stars rating={r.rating} />
                    <span className="text-sm font-semibold text-navy-900">{r.customer_first_name}</span>
                    <span className="text-xs text-navy-400">· {r.category} · {new Date(r.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    <Badge tone="green" className="ml-auto">Geverifieerde klus</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-navy-700">{r.body}</p>
                  {r.contractor_reply && <p className="mt-3 border-l-2 border-navy-100 pl-3 text-sm text-navy-500"><strong className="text-navy-700">Reactie van {profile.company_name}:</strong> {r.contractor_reply}</p>}
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
