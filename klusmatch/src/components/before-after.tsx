'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { SiteImage } from '@/lib/images';

export type Example = { key: string; label: string; before: SiteImage; after: SiteImage };

/** Drag-to-compare slider. Examples are illustrations, labelled as such. */
export function BeforeAfter({ examples }: { examples: Example[] }) {
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState(50);
  const ex = examples[active];
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Voorbeelden">
        {examples.map((e, i) => (
          <button
            key={e.key}
            role="tab"
            aria-selected={i === active}
            onClick={() => { setActive(i); setPos(50); }}
            className={`chip px-3.5 py-1.5 text-sm transition ${i === active ? 'bg-navy-900 text-white' : 'bg-white text-navy-600 ring-1 ring-navy-200 hover:ring-navy-300'}`}
          >
            {e.label}
          </button>
        ))}
      </div>
      <div className="relative select-none overflow-hidden rounded-3xl shadow-lift">
        <Image {...ex.after} sizes="(min-width: 1024px) 1100px, 100vw" className="aspect-[3/2] w-full object-cover" />
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          <Image {...ex.before} sizes="(min-width: 1024px) 1100px, 100vw" className="aspect-[3/2] w-full object-cover" />
        </div>
        <div className="pointer-events-none absolute inset-y-0 w-1 -translate-x-1/2 bg-white shadow" style={{ left: `${pos}%` }}>
          <span className="absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-navy-900 shadow-lift">⇆</span>
        </div>
        <span className="absolute left-4 top-4 rounded-full bg-navy-950/70 px-3 py-1 text-xs font-semibold text-white">Voor</span>
        <span className="absolute right-4 top-4 rounded-full bg-leaf-600/90 px-3 py-1 text-xs font-semibold text-white">Na</span>
        <input
          type="range"
          min={0}
          max={100}
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          aria-label="Schuif om voor en na te vergelijken"
          className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
        />
      </div>
      <p className="mt-3 text-center text-xs text-navy-400">Illustratie van het soort klussen dat je via KlusMatch regelt — geen opdracht van een echte klant.</p>
    </div>
  );
}
