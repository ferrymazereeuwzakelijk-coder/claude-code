'use client';

import { useActionState } from 'react';
import { createLinkCodeAction } from '@/app/actions/customer';
import { SubmitButton } from '@/components/forms';

export function WhatsAppLinkCard({ linkedPhone }: { linkedPhone: string | null }) {
  const [state, action] = useActionState(createLinkCodeAction, undefined);
  return (
    <div className="card overflow-hidden">
      <div className="bg-[#E7F8EE] px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#25D366] text-white">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.4.5c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.1 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.8-.1 1.4Z" /></svg>
          </span>
          <p className="font-semibold text-navy-900">WhatsApp</p>
        </div>
      </div>
      <div className="p-5 text-sm">
        {linkedPhone ? (
          <p className="text-navy-600">
            Gekoppeld aan <strong className="text-navy-900">{linkedPhone}</strong>. Je ontvangt offertes in WhatsApp en kunt daar ook accepteren.
          </p>
        ) : (
          <>
            <p className="text-navy-600">Koppel je nummer en regel alles via WhatsApp: klussen plaatsen, offertes ontvangen en accepteren.</p>
            {state?.ok ? (
              <div className="mt-4 rounded-xl border border-dashed border-leaf-300 bg-leaf-50 p-4 text-center">
                <p className="text-xs text-leaf-800">Stuur dit bericht naar KlusMatch op WhatsApp:</p>
                <p className="mt-1 font-mono text-xl font-bold tracking-widest text-navy-900">KOPPEL {state.ok}</p>
                <p className="mt-1 text-xs text-navy-400">Geldig voor 15 minuten</p>
              </div>
            ) : (
              <form action={action} className="mt-4">
                <SubmitButton className="btn-secondary w-full">Koppelcode aanmaken</SubmitButton>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
