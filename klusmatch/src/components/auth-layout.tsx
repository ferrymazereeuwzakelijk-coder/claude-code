import type { ReactNode } from 'react';
import { Logo } from './ui';

export function AuthLayout({ title, subtitle, children, aside }: { title: string; subtitle: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12 animate-fade-up">
          <h1 className="text-[28px] font-bold leading-tight text-navy-900">{title}</h1>
          <p className="mt-2 text-[15px] text-navy-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
      <aside className="relative hidden overflow-hidden bg-navy-900 lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_70%_20%,rgba(16,185,129,0.28),transparent_70%),radial-gradient(50%_60%_at_10%_90%,rgba(74,102,144,0.5),transparent_70%)]" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="relative flex h-full flex-col justify-end p-14 text-white">{aside}</div>
      </aside>
    </div>
  );
}
