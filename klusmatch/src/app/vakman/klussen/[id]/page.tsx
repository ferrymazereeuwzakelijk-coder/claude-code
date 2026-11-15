import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/guards';
import { AppShell } from '@/components/app-shell';
import { ActionForm, SubmitButton } from '@/components/forms';
import { Badge, Notice, eur, km, relTime } from '@/components/ui';
import { MessageThread } from '@/components/message-thread';
import { sql } from '@/lib/db';
import { contractorEligibility, PRICE_TYPE_LABEL } from '@/lib/quotes';
import { listThread } from '@/lib/messages';
import { submitQuoteAction, toggleSaveJobAction } from '@/app/actions/contractor';

export default async function ContractorJobPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole('contractor');
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = sql();
  const elig = await contractorEligibility(db, user.id, id);
  const [myQuote] = await db<{ id: string; ref: string; amount_cents: number; price_type: keyof typeof PRICE_TYPE_LABEL; message: string; status: string; created_at: Date }[]>`
    select id, ref, amount_cents, price_type, message, status, created_at from quotes where job_id = ${id} and contractor_id = ${user.id}`;
  // Visible when it is in the contractor's area & trade and still open, or when they already quoted.
  const visible = elig && ((elig.status === 'published' && elig.in_category && elig.in_radius) || myQuote);
  if (!visible) notFound();

  const [job] = await db<{ id: string; ref: string; title: string; description: string; status: string; region_name: string; postcode4: string; timing: string; budget_max_cents: number | null; published_at: Date; category: string; quote_count: number; distance_km: number }[]>`
    select j.id, j.ref, j.title, j.description, j.status, j.region_name, j.postcode4, j.timing, j.budget_max_cents, j.published_at, c.name_nl as category,
           (select count(*)::int from quotes q where q.job_id = j.id and q.status <> 'withdrawn') as quote_count,
           round(km_distance(cp.base_lat, cp.base_lng, j.lat, j.lng)::numeric, 1)::float as distance_km
    from jobs j join categories c on c.slug = j.category_slug, contractor_profiles cp
    where j.id = ${id} and cp.user_id = ${user.id}`;
  const media = await db<{ media_id: string; mime_type: string }[]>`select jm.media_id, m.mime_type from job_media jm join media m on m.id = jm.media_id where jm.job_id = ${id}`;
  const [{ saved }] = await db<{ saved: boolean }[]>`select exists (select 1 from saved_jobs where job_id = ${id} and contractor_id = ${user.id}) as saved`;
  const awardedToMe = myQuote?.status === 'accepted';
  const [priv] = awardedToMe
    ? await db<{ postcode_full: string | null; contact_phone: string | null; contact_name: string | null }[]>`select postcode_full, contact_phone, contact_name from job_private_details where job_id = ${id}`
    : [];
  const thread = myQuote ? await listThread(db, user, id, user.id) : [];

  return (
    <AppShell user={user}>
      <Link href="/vakman" className="text-sm text-navy-500 hover:text-navy-900">← Alle klussen</Link>
      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="card p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{job.category}</Badge>
            <span className="text-xs text-navy-400">{job.ref} · {relTime(job.published_at)} · {job.quote_count} offerte{job.quote_count === 1 ? '' : 's'}</span>
            <form action={toggleSaveJobAction} className="ml-auto">
              <input type="hidden" name="jobId" value={job.id} />
              <button className="btn-ghost px-2.5 py-1.5 text-sm">{saved ? '★ Bewaard' : '☆ Bewaren'}</button>
            </form>
          </div>
          <h1 className="mt-3 text-2xl font-bold text-navy-900">{job.title}</h1>
          <dl className="mt-5 grid grid-cols-2 gap-4 rounded-xl bg-sand-50 p-4 text-sm sm:grid-cols-4">
            {[
              ['Regio', `${job.region_name} (${job.postcode4})`],
              ['Afstand', km(job.distance_km)],
              ['Planning', job.timing],
              ['Max. budget', job.budget_max_cents ? eur(job.budget_max_cents) : 'Niet opgegeven'],
            ].map(([k, v]) => (
              <div key={k}><dt className="text-xs text-navy-400">{k}</dt><dd className="mt-0.5 font-medium text-navy-900">{v}</dd></div>
            ))}
          </dl>
          <p className="mt-6 whitespace-pre-line text-[15px] leading-relaxed text-navy-700">{job.description}</p>
          {media.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-3">
              {media.map((m) =>
                m.mime_type.startsWith('image/') ? (
                  <a key={m.media_id} href={`/api/media/${m.media_id}`} target="_blank" rel="noreferrer"><img src={`/api/media/${m.media_id}`} alt="Foto van de klus" className="h-36 w-36 rounded-xl object-cover ring-1 ring-navy-100" /></a>
                ) : (
                  <video key={m.media_id} src={`/api/media/${m.media_id}`} controls className="h-36 rounded-xl" />
                ),
              )}
            </div>
          )}
          {awardedToMe && priv && (
            <div className="mt-6">
              <Notice tone="green" title="Je hebt deze klus gekregen 🎉">
                Neem contact op met {priv.contact_name ?? 'de klant'}: <strong>{priv.contact_phone ?? 'via berichten'}</strong>
                {priv.postcode_full && <> · postcode <strong>{priv.postcode_full}</strong></>}. Deze gegevens zijn alleen voor jou zichtbaar.
              </Notice>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          {myQuote ? (
            <div className="card p-5">
              <div className="flex items-center justify-between">
                <p className="eyebrow">Jouw offerte · {myQuote.ref}</p>
                <Badge tone={myQuote.status === 'accepted' ? 'green' : myQuote.status === 'declined' ? 'neutral' : 'blue'}>
                  {{ submitted: 'In afwachting', accepted: 'Geaccepteerd', declined: 'Niet gekozen', withdrawn: 'Ingetrokken' }[myQuote.status]}
                </Badge>
              </div>
              <p className="mt-3 font-display text-3xl font-bold text-navy-900">{eur(myQuote.amount_cents)}</p>
              <p className="text-xs text-navy-400">{PRICE_TYPE_LABEL[myQuote.price_type]} · verstuurd {relTime(myQuote.created_at)}</p>
              <p className="mt-3 whitespace-pre-line text-sm text-navy-700">{myQuote.message}</p>
            </div>
          ) : !elig.verified ? (
            <Notice tone="amber" title="Nog niet geverifieerd">Je kunt offertes versturen zodra je bedrijf is geverifieerd.</Notice>
          ) : (
            <div className="card p-5">
              <h2 className="font-semibold text-navy-900">Offerte uitbrengen</h2>
              <p className="mt-1 text-xs text-navy-400">Wees concreet over wat er in de prijs zit. Maten zijn een schatting van de klant.</p>
              <ActionForm action={submitQuoteAction} className="mt-4 space-y-3">
                <input type="hidden" name="jobId" value={job.id} />
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <div>
                    <label className="label" htmlFor="amountEur">Bedrag (€, incl. btw)</label>
                    <input className="input" id="amountEur" name="amountEur" inputMode="decimal" required placeholder="850" />
                  </div>
                  <div>
                    <label className="label" htmlFor="priceType">Soort</label>
                    <select className="input" id="priceType" name="priceType" defaultValue="fixed">
                      <option value="fixed">Vaste prijs</option>
                      <option value="estimate">Schatting</option>
                      <option value="hourly">Uurtarief</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="earliestStart">Vroegste startdatum</label>
                  <input className="input" id="earliestStart" name="earliestStart" type="date" />
                </div>
                <div>
                  <label className="label" htmlFor="message">Toelichting</label>
                  <textarea className="input min-h-32" id="message" name="message" required minLength={20} maxLength={4000} placeholder="Wat is inbegrepen, materiaal, planning, garantie…" />
                </div>
                <SubmitButton className="btn-primary w-full py-3" pendingText="Versturen…">Verstuur offerte</SubmitButton>
              </ActionForm>
            </div>
          )}
          {myQuote && (
            <MessageThread
              title="Gesprek met de klant"
              jobId={id}
              contractorId={user.id}
              meId={user.id}
              messages={thread.map((m) => ({ id: String(m.id), mine: m.sender_id === user.id, body: m.body, at: m.created_at.toISOString(), name: m.sender_name }))}
            />
          )}
        </aside>
      </div>
    </AppShell>
  );
}
