import Link from 'next/link';
import { company } from '@/lib/company';
import { Logo } from './ui';

/** Public footer with the operator's legal identity (required in commercial communication). */
export function SiteFooter() {
  const c = company();
  const identity = [c.legalName ?? c.brand, c.kvk && `KvK ${c.kvk}`, c.address].filter(Boolean).join(' · ');
  return (
    <footer className="border-t border-navy-100 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 text-sm text-navy-400 sm:flex-row sm:items-center">
        <Logo />
        <p className="sm:ml-6">{identity}</p>
        <nav className="flex flex-wrap gap-x-5 gap-y-1 sm:ml-auto" aria-label="Juridisch">
          <Link href="/voorwaarden" className="hover:text-navy-700">Voorwaarden</Link>
          <Link href="/privacy" className="hover:text-navy-700">Privacy</Link>
          {c.email && <a href={`mailto:${c.email}`} className="hover:text-navy-700">{c.email}</a>}
          <span>© {new Date().getFullYear()} {c.brand}</span>
        </nav>
      </div>
    </footer>
  );
}
