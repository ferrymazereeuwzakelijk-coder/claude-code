'use client';

import { useActionState, useEffect, useRef } from 'react';
import { addPortfolioAction, removePortfolioAction } from '@/app/actions/contractor';
import { SubmitButton } from '@/components/forms';

type Item = { id: string; media_id: string; caption: string; category: string | null };

export function PortfolioManager({ items, categories, max }: { items: Item[]; categories: { slug: string; name: string }[]; max: number }) {
  const [state, action] = useActionState(addPortfolioAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);
  return (
    <div className="space-y-5">
      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {items.map((p) => (
            <figure key={p.id} className="group relative overflow-hidden rounded-xl ring-1 ring-navy-100">
              <img src={`/api/media/${p.media_id}`} alt={p.caption || 'Portfolio-foto'} className="aspect-square w-full object-cover" />
              {p.caption && <figcaption className="truncate px-2 py-1.5 text-xs text-navy-600">{p.caption}</figcaption>}
              <form action={removePortfolioAction} className="absolute right-1.5 top-1.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                <input type="hidden" name="itemId" value={p.id} />
                <button className="grid h-7 w-7 place-items-center rounded-full bg-white/90 text-sm text-red-700 shadow" aria-label="Verwijder foto">×</button>
              </form>
            </figure>
          ))}
        </div>
      )}
      {items.length < max ? (
        <form ref={formRef} action={action} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div>
            <label className="label" htmlFor="photo">Foto van een project</label>
            <input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" required className="block w-full text-sm text-navy-600 file:mr-3 file:rounded-lg file:border-0 file:bg-navy-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-navy-800 hover:file:bg-navy-100" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input name="caption" className="input" placeholder="Bijschrift" maxLength={200} aria-label="Bijschrift" />
            <select name="category" className="input" aria-label="Vakgebied" defaultValue="">
              <option value="">Vakgebied…</option>
              {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </div>
          <SubmitButton className="btn-dark" pendingText="Uploaden…">Toevoegen</SubmitButton>
        </form>
      ) : (
        <p className="text-sm text-navy-400">Je portfolio is vol ({max} foto’s). Verwijder een foto om een nieuwe toe te voegen.</p>
      )}
      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{state.error}</p>}
      {state?.ok && <p className="rounded-lg bg-leaf-50 px-3 py-2 text-sm text-leaf-800" role="status">{state.ok}</p>}
      <p className="text-xs text-navy-400">Portfoliofoto’s zijn openbaar zichtbaar op je profiel. Gebruik geen foto’s waarop adressen, kentekens of personen herkenbaar zijn.</p>
    </div>
  );
}
