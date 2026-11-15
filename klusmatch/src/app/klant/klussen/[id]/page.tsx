import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/guards';
import { AppShell } from '@/components/app-shell';
import { Badge, JOB_STATUS, Notice, VerifiedBadge, eur, km, relTime } from '@/components/ui';
import { sql } from '@/lib/db';
import { PRICE_TYPE_LABEL, quotesForJob } from '@/lib/quotes';
import { listThread } from '@/lib/messages';
import { AcceptQuoteButton } from './accept-button';
import { MessageThread } from '@/components/message-thread';
import { RatingInline, Stars, Timeline } from '@/components/lifecycle';
import { CancelJobButton, CompleteJobButton, ReportButton, ReviewForm } from '@/components/action-dialogs';
import { jobTimeline } from '@/lib/jobs/lifecycle';
import { ratingsFor } from '@/lib/reviews';

export default async function CustomerJobPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ thread?: string }> }) {
  const user = await requireRole('customer');
  const { id } = await params;
  const { thread } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = sql();
  const [job] = await db<{ id: string; ref: string; title: string; description: string; status: string; region_name: string; postcode4: string; timing: string; budget_max_cents: number | null; published_at: Date; category: string; ai_assumptions: string[]; customer_id: string; accepted_quote_id: string | null }[]>`
    select j.*, c.name_nl as category from jobs j join categories c on c.slug = j.category_slug where j.id = ${id}`;
  if (!job || job.customer_id !== user.id) notFound();
  const quotes = await quotesForJob(db, id);
  const media = await db<{ media_id: string; mime_type: string }[]>`select jm.media_id, m.mime_type from job_media jm join media m on m.id = jm.media_id where jm.job_id = ${id}`;
  const [{ n: matched }] = await db<{ n: number }[]>`select count(*)::int as n from job_matches where job_id = ${id} and notified`;
  const lowest = quotes.length ? Math.min(...quotes.map((q) => q.amount_cents)) : null;
  const activeThread = quotes.find((q) => q.contractor_id === thread) ?? null;
  const threadMessages = activeThread ? await listThread(db, user, id, activeThread.contractor_id) : [];
  const status = JOB_STATUS[job.status];
  const [timeline, ratings] = await Promise.all([jobTimeline(db, id), ratingsFor(db, quotes.map((q) => q.contractor_id))]);
  const chosen = quotes.find((q) => q.status === 'accepted') ?? null;
  const [review] = await db<{ rating: number; body: string; contractor_reply: string | null }[]>`select rating, body, contractor_reply from reviews where job_id = ${id}`;

  return (
    <AppShell user={user}>
      <Link href="/klant" className="text-sm text-navy-500 hover:text-navy-900">← Mijn klussen</Link>
      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="card p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={status?.tone}>{status?.label}</Badge>
              <span className="text-xs text-navy-400">{job.ref} · geplaatst {relTime(job.published_at)}</span>
            </div>
            <h1 className="mt-3 text-2xl font-bold text-navy-900">{job.title}</h1>
            <dl className="mt-5 grid grid-cols-2 gap-4 rounded-xl bg-sand-50 p-4 text-sm sm:grid-cols-4">
              {[
                ['Categorie', job.category],
                ['Regio', `${job.region_name} (${job.postcode4})`],
                ['Planning', job.timing],
                ['Max. budget', job.budget_max_cents ? eur(job.budget_max_cents) : 'Geen maximum'],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-navy-400">{k}</dt>
                  <dd className="mt-0.5 font-medium text-navy-900">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 whitespace-pre-line text-[15px] leading-relaxed text-navy-700">{job.description}</p>
            {media.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-3">
                {media.map((m) =>
                  m.mime_type.startsWith('image/') ? (
                    <a key={m.media_id} href={`/api/media/${m.media_id}`} target="_blank" rel="noreferrer">
                      <img src={`/api/media/${m.media_id}`} alt="Foto van de klus" className="h-32 w-32 rounded-xl object-cover ring-1 ring-navy-100 transition hover:opacity-90" />
                    </a>
                  ) : (
                    <video key={m.media_id} src={`/api/media/${m.media_id}`} controls className="h-32 rounded-xl ring-1 ring-navy-100" />
                  ),
                )}
              </div>
            )}
            {job.ai_assumptions.length > 0 && (
              <div className="mt-6">
                <Notice tone="amber" title="AI-aannames in deze omschrijving">
                  <ul className="space-y-0.5">{job.ai_assumptions.map((a) => <li key={a}>• {a}</li>)}</ul>
                </Notice>
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-end justify-between">
              <h2 className="text-lg font-bold text-navy-900">Offertes vergelijken</h2>
              <span className="text-sm text-navy-400">{quotes.length} ontvangen</span>
            </div>
            {job.status === 'awarded' && (() => {
              const chosen = quotes.find((q) => q.status === 'accepted');
              return chosen ? (
                <div className="mb-4">
                  <Notice tone="green" title={`Je hebt gekozen voor ${chosen.company_name}`}>
                    Zij hebben je contactgegevens ontvangen en nemen contact met je op om een afspraak te maken. De andere vakmensen zijn op de hoogte gebracht.
                  </Notice>
                </div>
              ) : null;
            })()}
            {job.status === 'under_review' && <Notice tone="amber">Deze klus vraagt om een gespecialiseerd bedrijf en wordt eerst door ons gecontroleerd. Daarna gaat hij naar gecertificeerde vakmensen.</Notice>}
            {quotes.length === 0 && job.status === 'published' && (
              <div className="card p-8 text-center">
                <div className="mx-auto mb-3 flex w-fit gap-1">{[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 animate-pulse-dot rounded-full bg-leaf-500" style={{ animationDelay: `${i * 0.2}s` }} />)}</div>
                <p className="font-semibold text-navy-900">Wachten op offertes</p>
                <p className="mt-1 text-sm text-navy-500">
                  {matched > 0 ? `${matched} geverifieerde vakm${matched === 1 ? 'an is' : 'ensen zijn'} op de hoogte gebracht.` : 'We zoeken geschikte vakmensen in jouw regio.'} Je krijgt bericht zodra er een offerte binnenkomt.
                </p>
              </div>
            )}
            <div className="space-y-3">
              {quotes.map((q) => {
                const accepted = q.status === 'accepted';
                const overBudget = job.budget_max_cents != null && q.amount_cents > job.budget_max_cents;
                return (
                  <article key={q.id} className={`card p-5 transition ${accepted ? 'ring-2 ring-leaf-500' : q.status === 'declined' ? 'opacity-60' : ''}`}>
                    <div className="flex flex-wrap items-start gap-4">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-navy-900 font-display text-sm font-bold text-white">
                        {q.company_name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link href={`/vakmensen/${q.contractor_id}`} className="font-semibold text-navy-900 hover:text-leaf-800 hover:underline">{q.company_name}</Link>
                          {q.verification === 'verified' && <VerifiedBadge />}
                          {accepted && <Badge tone="dark">Gekozen</Badge>}
                          {q.status === 'declined' && <Badge>Afgewezen</Badge>}
                        </div>
                        <p className="mt-1"><RatingInline avg={ratings.get(q.contractor_id)?.avg} count={ratings.get(q.contractor_id)?.count} /></p>
                        <p className="mt-0.5 text-xs text-navy-400">{km(q.distance_km)} afstand · {q.categories.join(', ')} · {relTime(q.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-2xl font-bold text-navy-900">{eur(q.amount_cents)}</p>
                        <p className="text-xs text-navy-400">{PRICE_TYPE_LABEL[q.price_type]}{q.price_type === 'hourly' ? ' per uur' : ''}</p>
                        <div className="mt-1 flex justify-end gap-1">
                          {q.amount_cents === lowest && quotes.length > 1 && <Badge tone="green">Laagste prijs</Badge>}
                          {overBudget && <Badge tone="amber">Boven budget</Badge>}
                        </div>
                      </div>
                    </div>
                    <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-navy-700">{q.message}</p>
                    {q.earliest_start && <p className="mt-2 text-xs text-navy-500">Kan starten vanaf {new Date(q.earliest_start).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })}</p>}
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-navy-100 pt-4">
                      {job.status === 'published' && q.status === 'submitted' && <AcceptQuoteButton quoteId={q.id} company={q.company_name} amount={eur(q.amount_cents)} />}
                      <Link href={`/klant/klussen/${id}?thread=${q.contractor_id}#bericht`} scroll={false} className="btn-secondary">Stuur bericht</Link>
                      <span className="ml-auto"><ReportButton targetType="quote" targetId={q.id} label="Meld offerte" /></span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          {/* Next step for the customer, depending on status */}
          {job.status === 'awarded' && chosen && (
            <div className="card space-y-3 p-5">
              <p className="font-semibold text-navy-900">Is het werk klaar?</p>
              <p className="text-sm text-navy-500">Markeer de klus als afgerond zodra {chosen.company_name} klaar is. Daarna kun je een review schrijven.</p>
              <div className="flex flex-wrap items-center gap-2">
                <CompleteJobButton jobId={id} />
                <ReportButton kind="dispute" targetType="job" targetId={id} label="Probleem melden" buttonClass="btn-ghost text-sm" />
              </div>
            </div>
          )}
          {job.status === 'completed' && chosen && !review && <ReviewForm jobId={id} company={chosen.company_name} />}
          {review && (
            <div className="card p-5">
              <p className="eyebrow">Jouw review</p>
              <div className="mt-2"><Stars rating={review.rating} size="text-lg" /></div>
              <p className="mt-2 text-sm text-navy-700">{review.body}</p>
              {review.contractor_reply && <p className="mt-3 border-l-2 border-navy-100 pl-3 text-sm text-navy-500"><strong className="text-navy-700">Reactie:</strong> {review.contractor_reply}</p>}
            </div>
          )}
          {job.status === 'completed' && chosen && (
            <div className="flex justify-end"><ReportButton kind="dispute" targetType="job" targetId={id} label="Geschil melden" /></div>
          )}

          {activeThread ? (
            <div id="bericht">
              <MessageThread
                title={`Gesprek met ${activeThread.company_name}`}
                jobId={id}
                contractorId={activeThread.contractor_id}
                meId={user.id}
                messages={threadMessages.map((m) => ({ id: String(m.id), mine: m.sender_id === user.id, body: m.body, at: m.created_at.toISOString(), name: m.sender_name }))}
              />
            </div>
          ) : job.status === 'published' && (
            <div className="card p-5 text-sm text-navy-600">
              <p className="font-semibold text-navy-900">Tips bij het kiezen</p>
              <ul className="mt-2 space-y-1.5">
                <li>• Let op wat er in de prijs zit: materiaal, afvoer, voorrijkosten.</li>
                <li>• Een “schatting” kan nog veranderen na bezichtiging.</li>
                <li>• Stel vragen via een bericht voordat je accepteert.</li>
                <li>• Je adres en telefoonnummer delen we pas na acceptatie.</li>
              </ul>
            </div>
          )}
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-semibold text-navy-900">Voortgang</p>
              {(job.status === 'published' || job.status === 'under_review') && <CancelJobButton jobId={id} />}
            </div>
            <Timeline events={timeline} />
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
