import Link from 'next/link';
import type { ReactNode } from 'react';
import { sql } from '@/lib/db';
import { unreadCount } from '@/lib/notifications';
import type { SessionUser } from '@/lib/auth/session';
import { logoutAction } from '@/app/actions/auth';
import { Logo } from './ui';
import { NavLink } from './nav-link';
import { billingEnabled } from '@/lib/billing';

const NAV: Record<SessionUser['role'], { href: string; label: string }[]> = {
  customer: [
    { href: '/klant', label: 'Mijn klussen' },
    { href: '/klant/nieuw', label: 'Nieuwe klus' },
    { href: '/meldingen', label: 'Meldingen' },
  ],
  contractor: [
    { href: '/vakman', label: 'Klussen' },
    { href: '/vakman/offertes', label: 'Mijn offertes' },
    { href: '/vakman/profiel', label: 'Bedrijfsprofiel' },
    { href: '/meldingen', label: 'Meldingen' },
  ],
  admin: [
    { href: '/admin', label: 'Overzicht' },
    { href: '/admin/vakmensen', label: 'Vakmensen' },
    { href: '/admin/gebruikers', label: 'Gebruikers' },
    { href: '/admin/klussen', label: 'Moderatie' },
    { href: '/admin/meldingen', label: 'Meldingen' },
    { href: '/admin/systeem', label: 'Systeem' },
  ],
};

const ROLE_LABEL = { customer: 'Klant', contractor: 'Vakman', admin: 'Beheer' };

export async function AppShell({ user, children }: { user: SessionUser; children: ReactNode }) {
  const unread = await unreadCount(sql(), user.id);
  const nav = NAV[user.role].concat(user.role === 'contractor' && billingEnabled() ? [{ href: '/vakman/abonnement', label: 'Abonnement' }] : []);
  const [{ n: openReports }] = user.role === 'admin' ? await sql()<{ n: number }[]>`select count(*)::int as n from reports where status = 'open'` : [{ n: 0 }];
  const badgeFor = (href: string) => (href === '/meldingen' ? unread : href === '/admin/meldingen' ? openReports : 0);
  const initials = user.fullName.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="min-h-screen bg-sand-50">
      <header className="sticky top-0 z-30 border-b border-navy-100/80 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Logo />
          <span className="hidden rounded-md bg-navy-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-navy-500 sm:inline">{ROLE_LABEL[user.role]}</span>
          <nav className="ml-2 hidden items-center gap-1 md:flex" aria-label="Hoofdmenu">
            {nav.map((n) => (
              <NavLink key={n.href} href={n.href} badge={badgeFor(n.href)}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight text-navy-900">{user.fullName}</p>
              <p className="text-xs leading-tight text-navy-400">{user.email ?? user.phone}</p>
            </div>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-navy-800 to-navy-600 text-xs font-bold text-white">{initials}</span>
            <form action={logoutAction}>
              <button className="btn-ghost px-2.5" title="Uitloggen" aria-label="Uitloggen">
                <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11" />
                </svg>
              </button>
            </form>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-navy-100/70 px-3 py-2 md:hidden" aria-label="Hoofdmenu mobiel">
          {nav.map((n) => (
            <NavLink key={n.href} href={n.href} badge={badgeFor(n.href)}>
              {n.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
      <footer className="mx-auto max-w-6xl px-4 pb-10 text-xs text-navy-400 sm:px-6">
        <Link href="/" className="hover:text-navy-600">KlusMatch</Link> · Persoonsgegevens worden nooit openbaar getoond.
      </footer>
    </div>
  );
}
