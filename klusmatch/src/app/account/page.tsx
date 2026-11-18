import { requireRole } from '@/lib/auth/guards';
import { AppShell } from '@/components/app-shell';
import { ActionForm, SubmitButton } from '@/components/forms';
import { PageHeader } from '@/components/ui';
import { changePasswordAction } from '@/app/actions/auth';

export const metadata = { title: 'Mijn account' };

export default async function AccountPage() {
  const user = await requireRole();
  return (
    <AppShell user={user}>
      <PageHeader eyebrow="Account" title="Mijn account" description={`Ingelogd als ${user.email ?? user.phone}.`} />
      <section className="card max-w-lg p-6">
        <h2 className="font-semibold text-navy-900">Wachtwoord wijzigen</h2>
        <p className="mt-1 text-sm text-navy-500">Na het wijzigen word je op alle andere apparaten uitgelogd.</p>
        <ActionForm action={changePasswordAction} className="mt-5 space-y-4" resetOnOk>
          <div>
            <label className="label" htmlFor="current">Huidig wachtwoord</label>
            <input className="input" id="current" name="current" type="password" autoComplete="current-password" required />
          </div>
          <div>
            <label className="label" htmlFor="next">Nieuw wachtwoord</label>
            <input className="input" id="next" name="next" type="password" autoComplete="new-password" minLength={10} required />
            <p className="mt-1.5 text-xs text-navy-400">Minimaal 10 tekens.</p>
          </div>
          <SubmitButton pendingText="Opslaan…">Wachtwoord opslaan</SubmitButton>
        </ActionForm>
      </section>
    </AppShell>
  );
}
