import type { ReactNode } from 'react';
import Image from 'next/image';
import { Logo } from './ui';
import { img } from '@/lib/images';

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
        <Image src={img('hero/auth-aside.jpg').src} alt="" fill sizes="50vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-900/60 to-navy-900/10" />
        <div className="relative flex h-full flex-col justify-end p-14 text-white">{aside}</div>
      </aside>
    </div>
  );
}
