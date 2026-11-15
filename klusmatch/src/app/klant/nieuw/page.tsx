import { requireRole } from '@/lib/auth/guards';
import { AppShell } from '@/components/app-shell';
import { sql } from '@/lib/db';
import { listCategories } from '@/lib/categories';
import { getIntake, intakeMessages, selectProvider } from '@/lib/intake/engine';
import { IntakeChat, type ChatMessage } from './intake-chat';

export const metadata = { title: 'Nieuwe klus' };

export default async function NewJobPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const user = await requireRole('customer');
  const { id } = await searchParams;
  const categories = await listCategories(sql());
  const intake = id && /^[0-9a-f-]{36}$/i.test(id) ? await getIntake(sql(), id) : null;
  const owned = intake && intake.customer_id === user.id ? intake : null;
  const messages: ChatMessage[] = owned
    ? (await intakeMessages(sql(), owned.id)).map((m) => ({ id: String(m.id), role: m.role, body: m.body, mediaIds: m.media_ids }))
    : [];
  const provider = selectProvider();
  return (
    <AppShell user={user}>
      <IntakeChat
        firstName={user.fullName.split(' ')[0]}
        categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
        aiMode={provider.name}
        initial={
          owned
            ? { id: owned.id, state: owned.state, facts: owned.facts, draft: owned.draft, messages, jobId: owned.job_id }
            : null
        }
      />
    </AppShell>
  );
}
