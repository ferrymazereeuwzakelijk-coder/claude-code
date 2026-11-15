import { EVENT_LABEL, type JobEventKind } from '@/lib/jobs/lifecycle';

export function Stars({ rating, size = 'text-sm' }: { rating: number; size?: string }) {
  const full = Math.round(rating);
  return (
    <span className={`${size} tracking-tight`} aria-label={`${rating} van 5 sterren`}>
      <span className="text-amber-400">{'★'.repeat(full)}</span>
      <span className="text-navy-200">{'★'.repeat(5 - full)}</span>
    </span>
  );
}

export function RatingInline({ avg, count }: { avg: number | null | undefined; count: number | undefined }) {
  if (!count || avg == null) return <span className="text-xs text-navy-400">Nog geen reviews</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-navy-600">
      <Stars rating={avg} size="text-xs" /> <strong className="text-navy-900">{avg.toFixed(1)}</strong> ({count})
    </span>
  );
}

const DOT: Partial<Record<JobEventKind, string>> = {
  published: 'bg-leaf-500',
  approved: 'bg-leaf-500',
  quote_received: 'bg-sky-500',
  awarded: 'bg-navy-900',
  completed: 'bg-leaf-600',
  reviewed: 'bg-amber-400',
  cancelled: 'bg-navy-300',
  removed: 'bg-red-500',
  disputed: 'bg-red-500',
};

export function Timeline({ events }: { events: { id: string; kind: JobEventKind; created_at: Date; metadata: Record<string, unknown> }[] }) {
  // Collapse repeated quote events into one line with a count.
  const items: { key: string; kind: JobEventKind; label: string; at: Date }[] = [];
  for (const e of events) {
    const prev = items.at(-1);
    if (e.kind === 'quote_received' && prev?.kind === 'quote_received') {
      const n = Number(prev.label.match(/\d+/)?.[0] ?? 1) + 1;
      prev.label = `${n} offertes ontvangen`;
      continue;
    }
    items.push({ key: e.id, kind: e.kind, label: EVENT_LABEL[e.kind] ?? e.kind, at: e.created_at });
  }
  return (
    <ol className="relative space-y-4 border-l border-navy-100 pl-5">
      {items.map((i) => (
        <li key={i.key} className="relative">
          <span className={`absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-white ${DOT[i.kind] ?? 'bg-navy-300'}`} />
          <p className="text-sm font-medium text-navy-900">{i.label}</p>
          <p className="text-xs text-navy-400">{new Date(i.at).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
        </li>
      ))}
    </ol>
  );
}
