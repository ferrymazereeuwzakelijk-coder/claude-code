import Link from 'next/link';
import { AuthLayout } from '@/components/auth-layout';
import { ActionForm, SubmitButton } from '@/components/forms';
import { registerAction } from '@/app/actions/auth';

export const metadata = { title: 'Account aanmaken' };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ rol?: string; uitnodiging?: string }> }) {
  const { rol, uitnodiging } = await searchParams;
  const contractor = rol === 'vakman';
  return (
    <AuthLayout
      title={contractor ? 'Word KlusMatch-vakman' : 'Maak je account aan'}
      subtitle={
        <>
          Heb je al een account?{' '}
          <Link href="/inloggen" className="font-semibold text-leaf-700 hover:underline">Log in</Link>
        </>
      }
      aside={
        <div className="max-w-md space-y-5">
          {[
            ['Alleen echte klussen', 'Elke aanvraag is door de klant zelf bevestigd en heeft een budget-indicatie.'],
            ['Geverifieerde bedrijven', 'Vakmensen worden gecontroleerd op KvK-inschrijving voordat ze offertes sturen.'],
            ['Privacy voorop', 'Adres en telefoonnummer worden pas gedeeld na acceptatie van een offerte.'],
          ].map(([t, d]) => (
            <div key={t} className="flex gap-3">
              <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-leaf-500/20 text-leaf-300">✓</span>
              <div>
                <p className="font-semibold">{t}</p>
                <p className="text-sm text-navy-300">{d}</p>
              </div>
            </div>
          ))}
        </div>
      }
    >
      <ActionForm action={registerAction} className="space-y-4">
        {uitnodiging && <input type="hidden" name="invite" value={uitnodiging.slice(0, 12)} />}
        <fieldset>
          <legend className="label">Ik ben een</legend>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['customer', 'Klant', 'Ik zoek een vakman'],
              ['contractor', 'Vakman', 'Ik zoek klussen'],
            ].map(([value, label, hint]) => (
              <label key={value} className="relative cursor-pointer rounded-xl border border-navy-200 p-3 transition has-[:checked]:border-leaf-500 has-[:checked]:bg-leaf-50/60 has-[:checked]:ring-4 has-[:checked]:ring-leaf-500/10">
                <input type="radio" name="role" value={value} defaultChecked={contractor ? value === 'contractor' : value === 'customer'} className="sr-only" />
                <span className="block text-sm font-semibold text-navy-900">{label}</span>
                <span className="block text-xs text-navy-500">{hint}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label className="label" htmlFor="fullName">Volledige naam</label>
          <input className="input" id="fullName" name="fullName" autoComplete="name" required />
        </div>
        <div>
          <label className="label" htmlFor="email">E-mailadres</label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <label className="label" htmlFor="password">Wachtwoord</label>
          <input className="input" id="password" name="password" type="password" autoComplete="new-password" minLength={10} required />
          <p className="mt-1.5 text-xs text-navy-400">Minimaal 10 tekens.</p>
        </div>
        <SubmitButton className="btn-primary w-full py-3" pendingText="Account aanmaken…">Account aanmaken</SubmitButton>
        <p className="text-xs text-navy-400">Door je aan te melden ga je akkoord met de <Link href="/voorwaarden" className="underline" target="_blank">algemene voorwaarden</Link> en de <Link href="/privacy" className="underline" target="_blank">privacyverklaring</Link>.</p>
      </ActionForm>
    </AuthLayout>
  );
}
