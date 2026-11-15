import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthLayout } from '@/components/auth-layout';
import { ActionForm, SubmitButton } from '@/components/forms';
import { currentUser } from '@/lib/auth/session';
import { homeFor } from '@/lib/auth/guards';
import { loginAction } from '@/app/actions/auth';

export const metadata = { title: 'Inloggen' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await currentUser();
  if (user) redirect(homeFor(user.role));
  const { next } = await searchParams;
  return (
    <AuthLayout
      title="Welkom terug"
      subtitle={
        <>
          Nog geen account?{' '}
          <Link href="/registreren" className="font-semibold text-leaf-700 hover:underline">
            Maak er gratis een aan
          </Link>
        </>
      }
      aside={
        <blockquote className="max-w-md">
          <p className="font-display text-2xl font-semibold leading-snug">“Foto gestuurd vanaf de bank, twee dagen later stond de schilder op de stoep.”</p>
          <p className="mt-4 text-sm text-navy-300">Zo zou het moeten werken — daarom bouwen we KlusMatch.</p>
        </blockquote>
      }
    >
      <ActionForm action={loginAction} className="space-y-4">
        <input type="hidden" name="next" value={next ?? ''} />
        <div>
          <label className="label" htmlFor="email">E-mailadres</label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <label className="label" htmlFor="password">Wachtwoord</label>
          <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <SubmitButton className="btn-primary w-full py-3" pendingText="Bezig met inloggen…">Inloggen</SubmitButton>
      </ActionForm>
      <p className="mt-6 text-center text-sm text-navy-400">
        Klant via WhatsApp? Je hoeft niet in te loggen — alles werkt ook gewoon in de chat.
      </p>
    </AuthLayout>
  );
}
