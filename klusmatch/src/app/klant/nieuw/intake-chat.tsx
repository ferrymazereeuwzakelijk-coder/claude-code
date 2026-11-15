'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { IntakeFacts, IntakeState, JobDraft } from '@/lib/intake/types';
import { Spinner } from '@/components/forms';

export type ChatMessage = { id: string; role: 'customer' | 'assistant'; body: string; mediaIds?: string[]; previews?: string[] };

type Props = {
  firstName: string;
  categories: { slug: string; name: string }[];
  aiMode: 'anthropic' | 'rules';
  initial: { id: string; state: IntakeState; facts: IntakeFacts; draft: JobDraft | null; messages: ChatMessage[]; jobId: string | null } | null;
};

const TIMING: Record<string, string> = { spoed: 'Spoed', binnen_2_weken: 'Binnen 2 weken', binnen_maand: 'Binnen een maand', flexibel: 'Flexibel' };
const EXAMPLES = ['De schutting in de achtertuin moet geschilderd worden', 'Onze dakgoot lekt bij de voordeur', 'Ik wil het terras opnieuw laten bestraten, ongeveer 25 m²'];

export function IntakeChat({ firstName, categories, aiMode, initial }: Props) {
  const [intakeId, setIntakeId] = useState(initial?.id ?? null);
  const [state, setState] = useState<IntakeState>(initial?.state ?? 'collecting');
  const [facts, setFacts] = useState<IntakeFacts>(initial?.facts ?? {});
  const [draft, setDraft] = useState<JobDraft | null>(initial?.draft ?? null);
  const [jobId, setJobId] = useState<string | null>(initial?.jobId ?? null);
  const [messages, setMessages] = useState<ChatMessage[]>(
    initial?.messages.length
      ? initial.messages
      : [
          {
            id: 'welcome',
            role: 'assistant',
            body: `Hoi ${firstName}! Vertel in je eigen woorden wat er moet gebeuren, en stuur gerust een foto mee. Ik stel daarna een paar korte vragen en schrijf een duidelijke klusomschrijving voor je.`,
          },
        ],
  );
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy, draft]);

  async function ensureIntake(): Promise<string> {
    if (intakeId) return intakeId;
    const res = await fetch('/api/intake', { method: 'POST' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    setIntakeId(json.id);
    window.history.replaceState(null, '', `/klant/nieuw?id=${json.id}`);
    return json.id;
  }

  async function send(body: string) {
    if (busy || (!body.trim() && files.length === 0)) return;
    setError(null);
    setBusy(true);
    const previews = files.filter((f) => f.type.startsWith('image/')).map((f) => URL.createObjectURL(f));
    const optimistic: ChatMessage = { id: `local-${Date.now()}`, role: 'customer', body: body.trim(), previews };
    setMessages((m) => [...m, optimistic]);
    const sending = files;
    setText('');
    setFiles([]);
    try {
      const id = await ensureIntake();
      const fd = new FormData();
      fd.set('text', body);
      sending.forEach((f) => fd.append('files', f));
      const res = await fetch(`/api/intake/${id}/messages`, { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Versturen mislukt');
      setMessages((m) => [...m, { id: `a-${Date.now()}`, role: 'assistant', body: json.reply }]);
      setState(json.state);
      setFacts(json.facts);
      setDraft(json.draft);
      if (json.published) setJobId(json.published.jobId);
    } catch (e) {
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
      setText(body);
      setFiles(sending);
      setError(e instanceof Error ? e.message : 'Er ging iets mis');
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!intakeId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/intake/${intakeId}/confirm`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMessages((m) => [...m, { id: `a-${Date.now()}`, role: 'assistant', body: json.reply }]);
      setState('published');
      setJobId(json.jobId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Plaatsen mislukt');
    } finally {
      setBusy(false);
    }
  }

  const locked = state === 'published' || state === 'escalated' || state === 'cancelled';
  const catName = (slug?: string) => categories.find((c) => c.slug === slug)?.name ?? slug;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      {/* ── Chat ── */}
      <section className="card flex h-[calc(100vh-13rem)] min-h-[520px] flex-col overflow-hidden" aria-label="Klus-assistent">
        <div className="flex items-center gap-3 border-b border-navy-100 px-5 py-3.5">
          <span className="relative grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-leaf-500 to-leaf-700 text-white">
            <svg viewBox="0 0 24 24" className="h-4.5 h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 3v2M5.6 5.6l1.4 1.4M3 12h2m14 0h2m-3.6-6.4L17 7M8 14a4 4 0 1 1 8 0c0 1.5-.8 2.3-1.5 3-.4.4-.5.9-.5 1.5V19h-4v-.5c0-.6-.1-1.1-.5-1.5-.7-.7-1.5-1.5-1.5-3Z" strokeLinecap="round" />
            </svg>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-leaf-400" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-navy-900">Klus-assistent</p>
            <p className="truncate text-xs text-navy-400">
              {aiMode === 'anthropic' ? 'AI-intake met foto-analyse' : 'Regelgebaseerde intake · AI-sleutel niet geconfigureerd'}
            </p>
          </div>
        </div>

        <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto bg-gradient-to-b from-white to-sand-50/60 px-4 py-6 sm:px-6" aria-live="polite">
          {messages.map((m) => (
            <div key={m.id} className={`flex animate-fade-up ${m.role === 'customer' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] space-y-2 sm:max-w-[75%]`}>
                {(m.previews?.length || m.mediaIds?.length) ? (
                  <div className="flex flex-wrap justify-end gap-2">
                    {m.previews?.map((src) => <img key={src} src={src} alt="Geüploade foto" className="h-28 w-28 rounded-xl object-cover ring-1 ring-navy-100" />)}
                    {!m.previews?.length && m.mediaIds?.map((id) => <img key={id} src={`/api/media/${id}`} alt="Geüploade foto" className="h-28 w-28 rounded-xl object-cover ring-1 ring-navy-100" />)}
                  </div>
                ) : null}
                {m.body && m.body !== '[foto]' && (
                  <div
                    className={`whitespace-pre-line rounded-2xl px-4 py-2.5 text-[14.5px] leading-relaxed ${
                      m.role === 'customer' ? 'rounded-br-md bg-navy-900 text-white' : 'rounded-bl-md border border-navy-100 bg-white text-navy-800 shadow-sm'
                    }`}
                  >
                    {m.body.replace(/\*/g, '')}
                  </div>
                )}
              </div>
            </div>
          ))}

          {busy && (
            <div className="flex justify-start">
              <div className="flex gap-1 rounded-2xl rounded-bl-md border border-navy-100 bg-white px-4 py-3.5 shadow-sm" aria-label="Assistent typt">
                {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-navy-400" style={{ animationDelay: `${i * 0.18}s` }} />)}
              </div>
            </div>
          )}

          {state === 'awaiting_confirmation' && draft && (
            <div className="animate-fade-up rounded-2xl border border-leaf-200 bg-white p-5 shadow-lift">
              <p className="eyebrow">Concept klusomschrijving</p>
              <h3 className="mt-2 text-lg font-bold text-navy-900">{draft.title}</h3>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-navy-700">{draft.description}</p>
              {draft.assumptions.length > 0 && (
                <div className="mt-4 rounded-xl bg-amber-50 p-3.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">Aannames om te controleren</p>
                  <ul className="mt-1.5 space-y-1 text-sm text-amber-900">
                    {draft.assumptions.map((a) => <li key={a}>• {a}</li>)}
                  </ul>
                </div>
              )}
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
                <button onClick={confirm} disabled={busy} className="btn-primary py-3">
                  {busy ? <Spinner /> : null} Klopt, plaats mijn klus
                </button>
                <p className="text-xs text-navy-400 sm:ml-2">Iets aanpassen? Typ je correctie hieronder.</p>
              </div>
            </div>
          )}

          {state === 'published' && jobId && (
            <div className="animate-fade-up rounded-2xl bg-navy-900 p-5 text-white shadow-lift">
              <p className="font-display text-lg font-bold">Je klus staat online 🎉</p>
              <p className="mt-1 text-sm text-navy-200">We laten het je weten zodra er offertes binnenkomen.</p>
              <Link href={`/klant/klussen/${jobId}`} className="btn mt-4 bg-white text-navy-900 hover:bg-leaf-50">Bekijk je klus →</Link>
            </div>
          )}
        </div>

        {messages.length <= 1 && !busy && (
          <div className="flex gap-2 overflow-x-auto px-4 pb-2 sm:px-6">
            {EXAMPLES.map((e) => (
              <button key={e} onClick={() => setText(e)} className="shrink-0 rounded-full border border-navy-200 bg-white px-3 py-1.5 text-xs text-navy-600 transition hover:border-leaf-400 hover:text-navy-900">
                {e}
              </button>
            ))}
          </div>
        )}

        <form
          className="border-t border-navy-100 bg-white p-3 sm:p-4"
          onSubmit={(e) => {
            e.preventDefault();
            send(text);
          }}
        >
          {error && <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
          {files.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {files.map((f, i) => (
                <span key={i} className="chip bg-navy-50 text-navy-700 ring-1 ring-navy-100">
                  📎 {f.name.slice(0, 24)}
                  <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="ml-1 text-navy-400 hover:text-navy-900" aria-label={`Verwijder ${f.name}`}>×</button>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" multiple hidden onChange={(e) => setFiles([...files, ...Array.from(e.target.files ?? [])].slice(0, 4))} />
            <button type="button" disabled={locked} onClick={() => fileRef.current?.click()} className="btn-secondary h-11 w-11 shrink-0 p-0" aria-label="Foto of video toevoegen">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <rect x="3" y="5" width="18" height="14" rx="3" />
                <circle cx="12" cy="12" r="3.2" />
                <path d="M8 5l1.2-2h5.6L16 5" />
              </svg>
            </button>
            <textarea
              value={text}
              disabled={locked}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send(text);
                }
              }}
              rows={1}
              placeholder={locked ? 'Dit gesprek is afgerond' : 'Typ je bericht…'}
              className="input max-h-36 min-h-[44px] resize-none py-2.5"
              aria-label="Bericht"
            />
            <button type="submit" disabled={busy || locked || (!text.trim() && !files.length)} className="btn-primary h-11 w-11 shrink-0 p-0" aria-label="Verstuur">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden><path d="M3.4 20.4 21 12 3.4 3.6l.1 6.5L15 12l-11.5 1.9-.1 6.5Z" /></svg>
            </button>
          </div>
        </form>
      </section>

      {/* ── Live fact sheet ── */}
      <aside className="space-y-4">
        <div className="card p-5">
          <p className="eyebrow">Je aanvraag</p>
          <dl className="mt-4 space-y-3.5">
            {(
              [
                ['category', 'Soort klus', facts.category && catName(facts.category.value)],
                ['problem', 'Omschrijving', facts.problem?.value],
                ['postcode', 'Postcode', facts.postcode?.value],
                ['scope', 'Omvang', facts.scope?.value],
                ['timing', 'Planning', facts.timing && TIMING[facts.timing.value]],
                ['budget', 'Max. budget', facts.budget && (facts.budget.value ? `€ ${facts.budget.value.toLocaleString('nl-NL')}` : 'Geen maximum')],
              ] as const
            ).map(([key, label, value]) => {
              const src = facts[key]?.source;
              return (
                <div key={key} className="flex gap-3">
                  <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] ${value ? 'bg-leaf-500 text-white' : 'border border-dashed border-navy-200 text-transparent'}`}>✓</span>
                  <div className="min-w-0 flex-1">
                    <dt className="flex items-center gap-2 text-xs font-medium text-navy-400">
                      {label}
                      {value && src === 'ai_inferred' && <span className="chip bg-amber-50 px-1.5 py-0 text-[10px] text-amber-800 ring-1 ring-amber-100">AI-inschatting</span>}
                      {value && src === 'customer' && <span className="chip bg-navy-50 px-1.5 py-0 text-[10px] text-navy-500">Jouw invoer</span>}
                    </dt>
                    <dd className={`line-clamp-3 text-sm ${value ? 'text-navy-900' : 'text-navy-300'}`}>{value || 'Nog niet bekend'}</dd>
                  </div>
                </div>
              );
            })}
          </dl>
          {facts.imageObservations && (
            <div className="mt-4 rounded-xl bg-navy-50 p-3 text-xs text-navy-600">
              <span className="font-semibold">Foto-analyse (AI):</span> {facts.imageObservations.value}
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-navy-100 bg-white/60 p-5 text-sm text-navy-500">
          <p className="font-semibold text-navy-800">Jouw privacy</p>
          <p className="mt-1">Vakmensen zien alleen de regio en de eerste 4 cijfers van je postcode. Je adres en telefoonnummer delen we pas als jij een offerte accepteert.</p>
        </div>
      </aside>
    </div>
  );
}
