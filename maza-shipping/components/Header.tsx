"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LuArrowRight, LuChevronDown, LuMenu, LuPhone, LuX } from "react-icons/lu";
import Logo from "./Logo";
import LanguageSwitcher from "./LanguageSwitcher";
import { href, type Locale } from "@/content/i18n";
import type { Dictionary } from "@/content/dictionaries";
import { company } from "@/content/site";

type Props = { locale: Locale; nav: Dictionary["nav"] };

export default function Header({ locale, nav }: Props) {
  const pathname = usePathname() || "";
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [ddOpen, setDdOpen] = useState(false);
  const ddRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menus on navigation
  useEffect(() => {
    setMenuOpen(false);
    setDdOpen(false);
  }, [pathname]);

  // Lock scroll + Escape for the mobile menu
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setDdOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!ddOpen) return;
    const onDown = (e: MouseEvent) => {
      if (ddRef.current && !ddRef.current.contains(e.target as Node)) setDdOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [ddOpen]);

  const solid = scrolled || menuOpen;
  const isActive = (p: string) => (p === `/${locale}` ? pathname === p : pathname.startsWith(p));

  const services = [
    { label: nav.tugboat, hint: nav.tugboatHint, to: href(locale, "tugboat"), n: "01" },
    { label: nav.brokerage, hint: nav.brokerageHint, to: href(locale, "brokerage"), n: "02" },
  ];
  const servicesActive = services.some((s) => isActive(s.to));

  const linkCls = (active: boolean) =>
    `relative py-2 text-[0.92rem] font-semibold transition-colors hover:text-white ${active ? "text-white" : "text-white/75"} after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-left after:bg-signal after:transition-transform ${active ? "after:scale-x-100" : "after:scale-x-0 hover:after:scale-x-100"}`;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        solid ? "bg-navy/95 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.6)] backdrop-blur-md" : "bg-transparent"
      }`}
    >
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-navy">
        {nav.skip}
      </a>
      <div className={`container-x flex items-center justify-between transition-all duration-500 ${solid ? "h-[72px]" : "h-[88px]"}`}>
        <Link href={href(locale, "home")} aria-label="Maza Shipping – home" className="shrink-0">
          <Logo />
        </Link>

        {/* Desktop */}
        <nav aria-label="Main" className="hidden items-center gap-9 lg:flex">
          <Link href={href(locale, "home")} className={linkCls(isActive(`/${locale}`))}>
            {nav.home}
          </Link>

          <div
            ref={ddRef}
            className="relative"
            onMouseEnter={() => setDdOpen(true)}
            onMouseLeave={() => setDdOpen(false)}
          >
            <button
              type="button"
              aria-expanded={ddOpen}
              aria-controls="services-menu"
              onClick={() => setDdOpen((v) => !v)}
              className={`${linkCls(servicesActive)} inline-flex items-center gap-1.5`}
            >
              {nav.services}
              <LuChevronDown aria-hidden className={`h-4 w-4 transition-transform ${ddOpen ? "rotate-180" : ""}`} />
            </button>
            <div
              id="services-menu"
              className={`absolute top-full left-1/2 w-[380px] -translate-x-1/2 pt-4 transition-all duration-300 ${
                ddOpen ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0"
              }`}
            >
              <ul className="overflow-hidden rounded-2xl border border-white/10 bg-navy-800 p-2 shadow-2xl">
                {services.map((s) => (
                  <li key={s.to}>
                    <Link
                      href={s.to}
                      className="group flex items-start gap-4 rounded-xl p-4 transition-colors hover:bg-white/5 focus-visible:bg-white/5"
                    >
                      <span className="mt-0.5 font-mono text-xs text-teal-light">{s.n}</span>
                      <span className="flex-1">
                        <span className="block font-heading font-bold text-white">{s.label}</span>
                        <span className="mt-1 block text-sm text-white/55">{s.hint}</span>
                      </span>
                      <LuArrowRight aria-hidden className="mt-1 h-4 w-4 text-white/30 transition-all group-hover:translate-x-1 group-hover:text-signal" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <Link href={href(locale, "about")} className={linkCls(isActive(href(locale, "about")))}>
            {nav.about}
          </Link>
          <Link href={href(locale, "contact")} className={linkCls(isActive(href(locale, "contact")))}>
            {nav.contact}
          </Link>
        </nav>

        <div className="hidden items-center gap-6 text-white lg:flex">
          <LanguageSwitcher locale={locale} label={nav.language} />
          <Link href={href(locale, "contact", "quote")} className="btn-signal min-h-11 px-5 text-sm">
            {nav.requestQuote}
          </Link>
        </div>

        {/* Mobile toggle */}
        <div className="flex items-center gap-2 lg:hidden">
          <a href={company.phoneHref} aria-label={company.phoneDisplay} className="grid h-11 w-11 place-items-center rounded-full text-white">
            <LuPhone aria-hidden className="h-5 w-5" />
          </a>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? nav.closeMenu : nav.openMenu}
            className="grid h-11 w-11 place-items-center rounded-full border border-white/25 text-white"
          >
            {menuOpen ? <LuX aria-hidden className="h-5 w-5" /> : <LuMenu aria-hidden className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile panel */}
      <div
        id="mobile-menu"
        hidden={!menuOpen}
        className="h-[calc(100svh-72px)] overflow-y-auto border-t border-white/10 bg-navy lg:hidden"
      >
        <nav aria-label="Mobile" className="container-x flex flex-col py-6">
          {[
            { label: nav.home, to: href(locale, "home") },
            ...services.map((s) => ({ label: s.label, to: s.to, hint: s.hint })),
            { label: nav.about, to: href(locale, "about") },
            { label: nav.contact, to: href(locale, "contact") },
          ].map((l) => (
            <Link
              key={l.to}
              href={l.to}
              className="flex items-center justify-between border-b border-white/10 py-5 font-heading text-2xl font-bold text-white"
            >
              <span>
                {l.label}
                {"hint" in l && l.hint && <span className="mt-1 block font-sans text-sm font-normal text-white/50">{l.hint}</span>}
              </span>
              <LuArrowRight aria-hidden className="h-5 w-5 text-signal" />
            </Link>
          ))}
          <div className="mt-8 flex items-center justify-between text-white">
            <LanguageSwitcher locale={locale} label={nav.language} className="text-base" />
          </div>
          <Link href={href(locale, "contact", "quote")} className="btn-signal mt-8 w-full">
            {nav.requestQuote}
          </Link>
        </nav>
      </div>
    </header>
  );
}
