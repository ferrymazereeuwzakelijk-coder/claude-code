'use client';

import { useActionState, useState } from 'react';
import { acceptQuoteAction } from '@/app/actions/customer';
import { SubmitButton } from '@/components/forms';

/** Two-step acceptance: the customer must explicitly confirm in a dialog. */
export function AcceptQuoteButton({ quoteId, company, amount }: { quoteId: string; company: string; amount: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(acceptQuoteAction, undefined);
  if (state?.ok) return <p className="text-sm font-medium text-leaf-700">{state.ok}</p>;
  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}>Accepteer offerte</button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-navy-950/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby={`accept-${quoteId}`}>
          <div className="card w-full max-w-md animate-fade-up p-6">
            <h3 id={`accept-${quoteId}`} className="text-lg font-bold text-navy-900">Offerte accepteren?</h3>
            <p className="mt-2 text-sm text-navy-600">
              Je kiest voor <strong>{company}</strong> voor <strong>{amount}</strong>. Zij ontvangen je telefoonnummer en volledige postcode om een afspraak te maken. De andere vakmensen krijgen automatisch bericht.
            </p>
            <form action={action} className="mt-6 flex justify-end gap-2">
              <input type="hidden" name="quoteId" value={quoteId} />
              <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Annuleren</button>
              <SubmitButton pendingText="Accepteren…">Ja, accepteer</SubmitButton>
            </form>
            {state?.error && <p className="mt-3 text-sm text-red-700" role="alert">{state.error}</p>}
          </div>
        </div>
      )}
    </>
  );
}
