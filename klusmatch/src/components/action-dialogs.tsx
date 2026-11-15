'use client';

import { useActionState, useState, type ReactNode } from 'react';
import { reportAction } from '@/app/actions/reports';
import { cancelJobAction, completeJobAction, createReviewAction } from '@/app/actions/customer';
import { replyReviewAction } from '@/app/actions/contractor';
import { SubmitButton, type FormAction } from './forms';

const REASONS: [string, string][] = [
  ['no_show', 'Niet komen opdagen'],
  ['quality', 'Kwaliteit van het werk'],
  ['payment', 'Betaling of prijs'],
  ['fraud', 'Oplichting of fraude'],
  ['inappropriate', 'Ongepaste inhoud'],
  ['spam', 'Spam of reclame'],
  ['unsafe', 'Onveilige situatie'],
  ['other', 'Anders'],
];

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy-950/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="card w-full max-w-md animate-fade-up p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-bold text-navy-900">{title}</h3>
          <button onClick={onClose} className="text-xl leading-none text-navy-300 hover:text-navy-700" aria-label="Sluiten">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function DialogForm({ action, label, buttonClass, title, intro, children, submit }: { action: FormAction; label: string; buttonClass: string; title: string; intro?: ReactNode; children?: ReactNode; submit: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(action, undefined);
  return (
    <>
      <button type="button" className={buttonClass} onClick={() => setOpen(true)}>{label}</button>
      {open && (
        <Dialog title={title} onClose={() => setOpen(false)}>
          {state?.ok ? (
            <>
              <p className="mt-3 rounded-lg bg-leaf-50 px-3 py-2 text-sm text-leaf-800" role="status">{state.ok}</p>
              <div className="mt-5 flex justify-end"><button className="btn-secondary" onClick={() => setOpen(false)}>Sluiten</button></div>
            </>
          ) : (
            <form action={formAction} className="mt-3 space-y-3">
              {intro && <div className="text-sm text-navy-600">{intro}</div>}
              {children}
              {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{state.error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Annuleren</button>
                <SubmitButton>{submit}</SubmitButton>
              </div>
            </form>
          )}
        </Dialog>
      )}
    </>
  );
}

export function ReportButton({ kind = 'report', targetType, targetId, label, buttonClass = 'btn-ghost px-2.5 py-1.5 text-xs' }: { kind?: 'report' | 'dispute'; targetType: string; targetId: string; label: string; buttonClass?: string }) {
  return (
    <DialogForm
      action={reportAction}
      label={label}
      buttonClass={buttonClass}
      title={kind === 'dispute' ? 'Geschil melden' : 'Melding maken'}
      intro={kind === 'dispute' ? 'Komen jullie er samen niet uit? KlusMatch bemiddelt en neemt contact op met beide partijen.' : 'Klopt er iets niet? Laat het ons weten, we kijken er vertrouwelijk naar.'}
      submit={kind === 'dispute' ? 'Geschil melden' : 'Versturen'}
    >
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      <div>
        <label className="label" htmlFor={`reason-${targetId}`}>Reden</label>
        <select id={`reason-${targetId}`} name="reason" className="input" defaultValue={kind === 'dispute' ? 'quality' : 'inappropriate'}>
          {REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor={`body-${targetId}`}>Toelichting</label>
        <textarea id={`body-${targetId}`} name="body" className="input min-h-28" required minLength={10} maxLength={4000} />
      </div>
    </DialogForm>
  );
}

export function CancelJobButton({ jobId }: { jobId: string }) {
  return (
    <DialogForm action={cancelJobAction} label="Klus annuleren" buttonClass="btn-ghost text-sm text-red-700 hover:bg-red-50" title="Klus annuleren?" intro="Vakmensen kunnen dan geen offerte meer sturen. Uitgebrachte offertes vervallen en de vakmensen krijgen bericht." submit="Ja, annuleer">
      <input type="hidden" name="jobId" value={jobId} />
      <div>
        <label className="label" htmlFor="cancel-reason">Reden (optioneel)</label>
        <input id="cancel-reason" name="reason" className="input" maxLength={500} placeholder="Bijv. zelf opgelost" />
      </div>
    </DialogForm>
  );
}

export function CompleteJobButton({ jobId }: { jobId: string }) {
  return (
    <DialogForm action={completeJobAction} label="Markeer als afgerond" buttonClass="btn-primary" title="Is de klus klaar?" intro="Bevestig dat de vakman het werk heeft afgerond. Daarna kun je een review schrijven." submit="Ja, klus is afgerond">
      <input type="hidden" name="jobId" value={jobId} />
    </DialogForm>
  );
}

export function ReviewForm({ jobId, company }: { jobId: string; company: string }) {
  const [state, action] = useActionState(createReviewAction, undefined);
  const [rating, setRating] = useState(0);
  if (state?.ok) return <p className="rounded-xl bg-leaf-50 p-4 text-sm text-leaf-800">{state.ok}</p>;
  return (
    <form action={action} className="card space-y-4 p-5">
      <div>
        <p className="font-semibold text-navy-900">Hoe was het werken met {company}?</p>
        <p className="text-xs text-navy-400">Je review is openbaar zichtbaar op het profiel van de vakman, met alleen je voornaam.</p>
      </div>
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="rating" value={rating} />
      <div className="flex gap-1" role="radiogroup" aria-label="Score">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} ster${n > 1 ? 'ren' : ''}`} onClick={() => setRating(n)}
            className={`text-3xl leading-none transition hover:scale-110 ${n <= rating ? 'text-amber-400' : 'text-navy-200'}`}>★</button>
        ))}
      </div>
      <textarea name="body" className="input min-h-24" required minLength={10} maxLength={2000} placeholder="Wat ging goed? Wat kon beter?" aria-label="Review" />
      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{state.error}</p>}
      <SubmitButton>Plaats review</SubmitButton>
    </form>
  );
}

export function ReplyForm({ reviewId, jobId }: { reviewId: string; jobId: string }) {
  const [state, action] = useActionState(replyReviewAction, undefined);
  if (state?.ok) return <p className="text-sm text-leaf-700">{state.ok}</p>;
  return (
    <form action={action} className="mt-3 flex gap-2">
      <input type="hidden" name="reviewId" value={reviewId} />
      <input type="hidden" name="jobId" value={jobId} />
      <input name="reply" className="input" placeholder="Reageer op deze review (één keer)" maxLength={1000} required aria-label="Reactie" />
      <SubmitButton className="btn-dark shrink-0">Reageer</SubmitButton>
      {state?.error && <p className="text-sm text-red-700" role="alert">{state.error}</p>}
    </form>
  );
}
