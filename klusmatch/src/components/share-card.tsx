'use client';

import { useState } from 'react';

/** Lets a contractor invite colleagues: one tap to WhatsApp, or copy the personal link. */
export function ShareCard({ link, whatsappHref, signedUp, verified, foundingNo }: { link: string; whatsappHref: string; signedUp: number; verified: number; foundingNo: number | null }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="card overflow-hidden">
      {foundingNo && (
        <div className="flex items-center gap-3 bg-navy-900 px-5 py-3 text-white">
          <span className="text-xl text-amber-300">★</span>
          <p className="text-sm"><strong>Founding Member #{foundingNo}</strong> <span className="text-navy-300">· zichtbaar op je profiel en offertes</span></p>
        </div>
      )}
      <div className="p-5">
        <p className="font-semibold text-navy-900">Ken je een goede collega?</p>
        <p className="mt-1 text-sm text-navy-500">Hoe meer goede vakmensen in de regio, hoe meer klanten KlusMatch kiezen — en hoe meer klussen er voor jou binnenkomen.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href={whatsappHref} target="_blank" rel="noreferrer" className="btn bg-[#25D366] text-white hover:bg-[#1ebe5b]">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.4.5c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.1 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.8-.1 1.4Z" /></svg>
            Deel via WhatsApp
          </a>
          <button
            type="button"
            className="btn-secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                window.prompt('Kopieer je link:', link);
              }
            }}
          >
            {copied ? 'Gekopieerd ✓' : 'Kopieer link'}
          </button>
        </div>
        <p className="mt-3 break-all font-mono text-[11px] text-navy-400">{link}</p>
        {(signedUp > 0 || verified > 0) && (
          <p className="mt-3 text-sm text-navy-600">Via jou aangemeld: <strong>{signedUp}</strong> · geverifieerd: <strong>{verified}</strong></p>
        )}
      </div>
    </div>
  );
}
