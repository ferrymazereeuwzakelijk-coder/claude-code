import Link from 'next/link';
import { requireRole } from '@/lib/auth/guards';
import { AppShell } from '@/components/app-shell';
import { EmptyState, PageHeader, relTime } from '@/components/ui';
import { sql } from '@/lib/db';

export const metadata = { title: 'Meldingen' };

export default async function NotificationsPage() {
  const user = await requireRole();
  const db = sql();
  const items = await db<{ id: string; title: string; body: string; link: string | null; read_at: Date | null; created_at: Date }[]>`
    select id, title, body, link, read_at, created_at from notifications where user_id = ${user.id} order by created_at desc limit 50`;
  // Viewing the list marks everything as read.
  await db`update notifications set read_at = now() where user_id = ${user.id} and read_at is null`;
  return (
    <AppShell user={user}>
      <PageHeader eyebrow="Meldingen" title="Wat er is gebeurd" />
      {items.length === 0 ? (
        <EmptyState title="Geen meldingen">Je bent helemaal bij.</EmptyState>
      ) : (
        <ul className="card divide-y divide-navy-100">
          {items.map((n) => (
            <li key={n.id}>
              <Link href={n.link ?? '#'} className="flex gap-4 p-4 transition hover:bg-sand-50 sm:px-6">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read_at ? 'bg-navy-100' : 'bg-leaf-500'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-navy-900">{n.title}</p>
                  <p className="text-sm text-navy-500">{n.body}</p>
                </div>
                <span className="shrink-0 text-xs text-navy-400">{relTime(n.created_at)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
