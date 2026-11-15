'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Logo } from '@/components/ui';

type Msg = { id: string; at: string; dir: 'in' | 'out'; body: string; imageId?: string | null; template?: string | null; status: string };
type Contact = { consent: string; user_id: string | null } | null;

const QUICK = ['JA', 'OFFERTES', 'HELP', 'NIEUW', 'STOP', 'START'];

function renderWa(text: string) {
  // WhatsApp-style *bold*
  return text.split(/(\*[^*\n]+\*)/g).map((part, i) => (part.startsWith('*') && part.endsWith('*') ? <strong key={i}>{part.slice(1, -1)}</strong> : part));
}

export function Simulator() {
  const [phone, setPhone] = useState('+31612345678');
  const [name, setName] = useState('Fatima Bakker');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [contact, setContact] = useState<Contact>(null);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [lastId, setLastId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/dev/whatsapp?phone=${encodeURIComponent(phone)}`, { cache: 'no-store' });
    if (!res.ok) return;
    const json = await res.json();
    setMessages(json.messages);
    setContact(json.contact);
  }, [phone]);

  useEffect(() => {
    load();
    const t = setInterval(load, 1500);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  async function send(body: string, replayId?: string) {
    if (busy || (!body.trim() && !file && !replayId)) return;
    setBusy(true);
    const fd = new FormData();
    fd.set('phone', phone);
    fd.set('name', name);
    fd.set('text', body);
    if (file && !replayId) fd.set('file', file);
    if (replayId) fd.set('replayId', replayId);
    try {
      const res = await fetch('/api/dev/whatsapp', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setLastId(json.waMessageId);
      setLog((l) => [`${new Date().toLocaleTimeString('nl-NL')} · webhook 200 · accepted ${json.accepted} · duplicates ${json.duplicates} · ${json.waMessageId.slice(0, 22)}…`, ...l].slice(0, 12));
      if (!replayId) {
        setText('');
        setFile(null);
      }
      setTimeout(load, 300);
      setTimeout(load, 1200);
    } catch (e) {
      setLog((l) => [`Fout: ${e instanceof Error ? e.message : e}`, ...l]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(80%_60%_at_50%_0%,#E8EDF4,transparent),#F4F7FA]">
      <header className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-5">
        <Logo />
        <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-800">Ontwikkelomgeving</span>
        <a href="/inloggen" className="ml-auto text-sm text-navy-500 hover:text-navy-900">Naar het platform →</a>
      </header>
      <main className="mx-auto grid max-w-6xl gap-8 px-6 pb-16 lg:grid-cols-[400px_minmax(0,1fr)]">
        {/* phone */}
        <div className="mx-auto w-full max-w-[400px]">
          <div className="overflow-hidden rounded-[2.5rem] border-[10px] border-navy-900 bg-navy-900 shadow-lift">
            <div className="flex items-center gap-3 bg-[#075E54] px-4 pb-3 pt-4 text-white">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-xs font-black text-navy-900">KM</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">KlusMatch</p>
                <p className="text-[11px] text-white/70">Zakelijk account · {contact ? `toestemming: ${contact.consent}` : 'nieuw contact'}</p>
              </div>
            </div>
            <div ref={listRef} className="h-[520px] space-y-1.5 overflow-y-auto bg-[#ECE5DD] px-3 py-4" aria-live="polite">
              {messages.length === 0 && <p className="mx-auto mt-24 max-w-[230px] rounded-lg bg-[#FFF3C4] p-3 text-center text-xs text-navy-700">Stuur een bericht om te beginnen, bijvoorbeeld een foto van je klus met een korte beschrijving.</p>}
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.dir === 'in' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[82%] rounded-lg px-2.5 py-1.5 text-[13.5px] leading-snug shadow-sm ${m.dir === 'in' ? 'rounded-tr-none bg-[#DCF8C6]' : 'rounded-tl-none bg-white'}`}>
                    {m.template && <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-amber-700">Template · {m.template}</p>}
                    {m.imageId && <img src={`/api/dev/whatsapp/media/${m.imageId}`} alt="Verstuurde foto" className="mb-1 max-h-48 rounded-md" />}
                    {m.body && <p className="whitespace-pre-line text-navy-900">{renderWa(m.body)}</p>}
                    <p className="mt-0.5 text-right text-[10px] text-navy-400">
                      {new Date(m.at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                      {m.dir === 'in' && <span className={m.status === 'processed' ? 'text-sky-500' : ''}> ✓✓</span>}
                      {m.dir === 'out' && m.status === 'queued' && ' ⏱'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-1.5 overflow-x-auto bg-[#F0F0F0] px-2 pt-2">
              {QUICK.map((q) => <button key={q} onClick={() => send(q)} disabled={busy} className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-navy-700 shadow-sm hover:bg-navy-50">{q}</button>)}
            </div>
            <form className="flex items-end gap-2 bg-[#F0F0F0] p-2" onSubmit={(e) => { e.preventDefault(); send(text); }}>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <button type="button" onClick={() => fileRef.current?.click()} className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${file ? 'bg-leaf-500 text-white' : 'bg-white text-navy-500'}`} aria-label="Foto bijvoegen" title={file?.name ?? 'Foto bijvoegen'}>📷</button>
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder={file ? `Bijschrift bij ${file.name.slice(0, 18)}…` : 'Bericht'} className="h-10 min-w-0 flex-1 rounded-full border-0 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]" aria-label="Bericht" />
              <button disabled={busy} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#25D366] text-white disabled:opacity-60" aria-label="Verstuur">➤</button>
            </form>
          </div>
        </div>

        {/* controls */}
        <div className="space-y-5">
          <div>
            <p className="eyebrow">WhatsApp-simulator</p>
            <h1 className="mt-2 text-3xl font-bold text-navy-900">Test de volledige WhatsApp-flow lokaal</h1>
            <p className="mt-2 max-w-xl text-navy-500">
              Berichten worden in het exacte Meta-formaat opgebouwd, ondertekend met je app-secret en door de échte webhook gestuurd: handtekeningcontrole, deduplicatie, wachtrij, toestemming, AI-intake en offertes. Uitgaande berichten worden opgeslagen in plaats van naar Meta verstuurd.
            </p>
          </div>
          <div className="card grid gap-4 p-5 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="phone">Telefoonnummer (klant)</label>
              <input id="phone" className="input font-mono" value={phone} onChange={(e) => setPhone(e.target.value.trim())} />
            </div>
            <div>
              <label className="label" htmlFor="name">Profielnaam</label>
              <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="sm:col-span-2 flex flex-wrap gap-2">
              <button className="btn-secondary text-xs" disabled={!lastId || busy} onClick={() => lastId && send('', lastId)}>↻ Laatste bericht opnieuw afleveren (dedupe-test)</button>
              <button className="btn-ghost text-xs" onClick={() => setPhone(`+316${Math.floor(10000000 + Math.random() * 89999999)}`)}>Nieuw willekeurig nummer</button>
            </div>
          </div>
          <div className="card p-5">
            <p className="text-sm font-semibold text-navy-900">Probeer dit scenario</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-navy-600">
              <li>Stuur een foto + “De schutting moet geschilderd worden”</li>
              <li>Geef toestemming met <b>JA</b> — je eerste bericht wordt daarna verwerkt</li>
              <li>Beantwoord de vragen (postcode, omvang, planning, budget)</li>
              <li>Bevestig met <b>JA</b> — de klus wordt gepubliceerd</li>
              <li>Log in als vakman (demo) en breng een offerte uit</li>
              <li>Stuur <b>OFFERTES</b>, dan <b>ACCEPTEER Qxxxxx</b> en <b>JA</b></li>
            </ol>
          </div>
          <div className="card p-5">
            <p className="text-sm font-semibold text-navy-900">Webhook-log</p>
            <ul className="mt-2 space-y-1 font-mono text-[11px] text-navy-500">
              {log.length === 0 ? <li>Nog geen verzoeken.</li> : log.map((l, i) => <li key={i}>{l}</li>)}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
