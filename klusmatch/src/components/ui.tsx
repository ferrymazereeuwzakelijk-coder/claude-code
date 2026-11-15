import Link from 'next/link';
import type { ReactNode } from 'react';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link href="/" className={`group inline-flex items-center gap-2 ${className}`} aria-label="KlusMatch home">
      <span className="relative grid h-8 w-8 place-items-center rounded-[10px] bg-navy-900 text-white shadow-sm transition group-hover:rotate-[-4deg]">
        <svg viewBox="0 0 24 24" className="h-4.5 h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 11.5 12 5l8 6.5" />
          <path d="m8.5 14.5 2.5 2.5 4.5-5" className="text-leaf-400" stroke="#34D399" />
        </svg>
      </span>
      <span className="font-display text-[17px] font-extrabold tracking-tight text-navy-900">
        Klus<span className="text-leaf-600">Match</span>
      </span>
    </Link>
  );
}

const TONES = {
  neutral: 'bg-navy-50 text-navy-700 ring-1 ring-inset ring-navy-100',
  green: 'bg-leaf-50 text-leaf-800 ring-1 ring-inset ring-leaf-100',
  amber: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-100',
  red: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-100',
  blue: 'bg-sky-50 text-sky-800 ring-1 ring-inset ring-sky-100',
  dark: 'bg-navy-900 text-white',
} as const;

export function Badge({ tone = 'neutral', children, className = '' }: { tone?: keyof typeof TONES; children: ReactNode; className?: string }) {
  return <span className={`chip ${TONES[tone]} ${className}`}>{children}</span>;
}

export function VerifiedBadge() {
  return (
    <Badge tone="green">
      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
        <path fillRule="evenodd" d="M10 1.5 3.5 4v5.2c0 4 2.8 7.6 6.5 8.8 3.7-1.2 6.5-4.8 6.5-8.8V4L10 1.5Zm3.2 6.3a.75.75 0 0 0-1.1-1l-3 3.3-1.3-1.3a.75.75 0 1 0-1 1.1l1.8 1.8c.3.3.8.3 1.1 0l3.5-3.9Z" clipRule="evenodd" />
      </svg>
      Geverifieerd
    </Badge>
  );
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="animate-fade-up">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-2xl font-bold text-navy-900 sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-[15px] text-navy-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-navy-50 text-navy-400">{icon ?? <DotsIcon />}</div>
      <h3 className="text-base font-semibold text-navy-900">{title}</h3>
      {children && <p className="mt-1.5 max-w-sm text-sm text-navy-500">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-navy-400">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold text-navy-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-navy-400">{hint}</p>}
    </div>
  );
}

export function Notice({ tone = 'neutral', title, children }: { tone?: 'neutral' | 'amber' | 'green' | 'red'; title?: string; children: ReactNode }) {
  const styles = {
    neutral: 'border-navy-100 bg-navy-50/60 text-navy-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    green: 'border-leaf-100 bg-leaf-50 text-leaf-900',
    red: 'border-red-200 bg-red-50 text-red-800',
  }[tone];
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${styles}`} role={tone === 'red' ? 'alert' : undefined}>
      {title && <p className="mb-0.5 font-semibold">{title}</p>}
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}

function DotsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3.5" y="5" width="17" height="14" rx="3" />
      <path d="M8 10h8M8 14h5" strokeLinecap="round" />
    </svg>
  );
}

export const eur = (cents: number | null | undefined) =>
  cents == null ? '—' : new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(cents / 100);

/** Distances come from coarse region centroids, so very small values are shown as a range. */
export const km = (d: number) => (d < 3 ? '< 3 km' : `${Math.round(d)} km`);

export const relTime = (d: Date | string) => {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return 'zojuist';
  if (diff < 3600) return `${Math.floor(diff / 60)} min geleden`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} uur geleden`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} dag${diff >= 172800 ? 'en' : ''} geleden`;
  return new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
};

export const JOB_STATUS: Record<string, { label: string; tone: keyof typeof TONES }> = {
  published: { label: 'Open voor offertes', tone: 'green' },
  under_review: { label: 'In controle', tone: 'amber' },
  awarded: { label: 'Vakman gekozen', tone: 'blue' },
  completed: { label: 'Afgerond', tone: 'neutral' },
  cancelled: { label: 'Geannuleerd', tone: 'neutral' },
  removed: { label: 'Verwijderd', tone: 'red' },
};
