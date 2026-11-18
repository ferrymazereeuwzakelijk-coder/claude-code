'use client';

import { useActionState, useEffect, useRef, type ReactNode } from 'react';
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
  // Remember what was submitted: React resets the form after every action, so after an error we put
  // the values back (never passwords or files) instead of making people retype everything.
  const submitted = useRef<FormData | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(async (prev: ActionState, fd: FormData) => {
    submitted.current = fd;
    return action(prev, fd);
  }, undefined);

  useEffect(() => {
    const form = formRef.current;
    const fd = submitted.current;
    if (!form || !fd) return;
    if (state?.ok && resetOnOk) {
      form.reset();
      return;
    }
    if (!state?.error) return;
    for (const el of Array.from(form.elements)) {
      const field = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      if (!field.name || field.type === 'password' || field.type === 'file' || field.type === 'hidden') continue;
      const values = fd.getAll(field.name).map(String);
      if (field instanceof HTMLInputElement && (field.type === 'checkbox' || field.type === 'radio')) field.checked = values.includes(field.value);
      else if (values.length) field.value = values[0];
    }
  }, [state, resetOnOk]);

  return (
    <form ref={formRef} action={formAction} className={className}>
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
