'use client';

import { useActionState, useEffect, useRef } from 'react';
import { sendMessageAction } from '@/app/actions/customer';
import { SubmitButton } from './forms';

type Msg = { id: string; mine: boolean; body: string; at: string; name: string };

export function MessageThread({ title, jobId, contractorId, messages }: { title: string; jobId: string; contractorId: string; meId: string; messages: Msg[] }) {
  const [state, action] = useActionState(sendMessageAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [state, messages.length]);
  return (
    <div className="card flex h-[520px] flex-col overflow-hidden">
      <div className="border-b border-navy-100 px-5 py-3.5">
        <p className="text-sm font-semibold text-navy-900">{title}</p>
        <p className="text-xs text-navy-400">Deel geen betaalgegevens via berichten.</p>
      </div>
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-sand-50/60 p-4">
        {messages.length === 0 && <p className="py-10 text-center text-sm text-navy-400">Nog geen berichten. Stel gerust een vraag.</p>}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${m.mine ? 'rounded-br-md bg-navy-900 text-white' : 'rounded-bl-md border border-navy-100 bg-white text-navy-800'}`}>
              {!m.mine && <p className="mb-0.5 text-[11px] font-semibold text-navy-400">{m.name}</p>}
              <p className="whitespace-pre-line">{m.body}</p>
              <p className={`mt-1 text-[10px] ${m.mine ? 'text-navy-300' : 'text-navy-400'}`}>{new Date(m.at).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
        ))}
      </div>
      <form ref={formRef} action={action} className="flex gap-2 border-t border-navy-100 p-3">
        <input type="hidden" name="jobId" value={jobId} />
        <input type="hidden" name="contractorId" value={contractorId} />
        <input name="body" className="input" placeholder="Schrijf een bericht…" required maxLength={4000} aria-label="Bericht" />
        <SubmitButton className="btn-dark shrink-0">Stuur</SubmitButton>
      </form>
      {state?.error && <p className="px-3 pb-3 text-sm text-red-700" role="alert">{state.error}</p>}
    </div>
  );
}
