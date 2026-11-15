'use client';

import { useActionState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';

export type ActionState = { error?: string; ok?: string } | undefined;
export type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export function SubmitButton({ children, className = 'btn-primary', pendingText }: { children: ReactNode; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending && <Spinner />}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}

/** Wraps a server action with pending state and inline error/success feedback. */
export function ActionForm({ action, children, className = '', resetOnOk = false }: { action: FormAction; children: ReactNode; className?: string; resetOnOk?: boolean }) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className} key={resetOnOk && state?.ok ? state.ok + Date.now() : undefined}>
      {children}
      {state?.error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="mt-3 rounded-lg bg-leaf-50 px-3 py-2 text-sm text-leaf-800" role="status">
          {state.ok}
        </p>
      )}
    </form>
  );
}

export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
