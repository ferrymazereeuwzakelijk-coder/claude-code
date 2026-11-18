import Link from 'next/link';
import type { ReactNode } from 'react';
import { company } from '@/lib/company';
import { Logo } from './ui';
import { SiteFooter } from './site-footer';

export function LegalLayout({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  const c = company();
  return (
    <div className="min-h-screen bg-sand-50">
      <header className="border-b border-navy-100 bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-6">
          <Logo />
          <Link href="/" className="ml-auto text-sm text-navy-500 hover:text-navy-900">← Terug naar de site</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12">
        {!c.legalReviewed && (
          <p className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong>Concept.</strong> Deze tekst wordt nog juridisch gecontroleerd en kan wijzigen.
          </p>
        )}
        <h1 className="text-3xl font-bold text-navy-900">{title}</h1>
        <p className="mt-2 text-sm text-navy-400">Laatst bijgewerkt: {updated}</p>
        <article className="legal mt-8 space-y-6 text-[15px] leading-relaxed text-navy-700 [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-navy-900 [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
          {children}
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
