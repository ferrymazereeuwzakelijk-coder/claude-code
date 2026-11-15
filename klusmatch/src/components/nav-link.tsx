'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export function NavLink({ href, children, badge = 0 }: { href: string; children: ReactNode; badge?: number }) {
  const path = usePathname();
  const root = ['/klant', '/vakman', '/admin'].includes(href);
  const active = root ? path === href || (path.startsWith(href + '/klussen') && href !== '/admin') : path.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`relative whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
        active ? 'bg-navy-900 text-white' : 'text-navy-600 hover:bg-navy-50 hover:text-navy-900'
      }`}
    >
      {children}
      {badge > 0 && (
        <span className="ml-1.5 inline-grid h-[18px] min-w-[18px] place-items-center rounded-full bg-leaf-500 px-1 text-[10px] font-bold text-white">{badge > 9 ? '9+' : badge}</span>
      )}
    </Link>
  );
}
