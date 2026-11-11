import Link from "next/link";
import Logo from "./Logo";
import { href, type Locale } from "@/content/i18n";
import type { Dictionary } from "@/content/dictionaries";
import { company } from "@/content/site";

type Props = { locale: Locale; t: Dictionary };

export default function Footer({ locale, t }: Props) {
  const year = new Date().getFullYear();
  const col = "hud text-teal-light";
  const link = "text-white/75 transition-colors hover:text-white";
  return (
    <footer className="bg-navy text-white">
      <div aria-hidden className="overflow-hidden border-b border-white/10">
        <p className="display translate-y-[18%] text-center text-[19vw] leading-none text-white/[0.04] select-none">MAZA</p>
      </div>
      <div className="container-x grid gap-12 border-t border-white/10 py-16 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.3fr] lg:py-20">
        <div>
          <Logo className="h-14 w-auto text-white" />
          <p className="mt-6 max-w-xs leading-relaxed text-white/60">{t.footer.tagline}</p>
          <p className="mt-6 text-[0.7rem] font-semibold tracking-[0.22em] text-white/35 uppercase">{company.geo.label} · Urk</p>
        </div>
        <div>
          <h2 className={col}>{t.footer.divisions}</h2>
          <ul className="mt-5 grid gap-3">
            <li><Link className={link} href={href(locale, "tugboat")}>{t.nav.tugboat}</Link></li>
            <li><Link className={link} href={href(locale, "brokerage")}>{t.nav.brokerage}</Link></li>
          </ul>
        </div>
        <div>
          <h2 className={col}>{t.footer.company}</h2>
          <ul className="mt-5 grid gap-3">
            <li><Link className={link} href={href(locale, "about")}>{t.nav.about}</Link></li>
            <li><Link className={link} href={href(locale, "contact")}>{t.nav.contact}</Link></li>
            <li><Link className={link} href={href(locale, "privacy")}>{t.footer.privacy}</Link></li>
          </ul>
        </div>
        <div>
          <h2 className={col}>{t.footer.contact}</h2>
          <address className="mt-5 grid gap-3 not-italic">
            <span className="text-white/75">{company.contactPerson}</span>
            <a className={link} href={company.phoneHref}>{company.phoneDisplay}</a>
            <a className={link} href={`mailto:${company.email}`}>{company.email}</a>
            <span className="text-white/75">
              {company.address.street}
              <br />
              {company.address.postalCode} {company.address.city}
            </span>
          </address>
        </div>
      </div>
      <div className="container-x flex flex-col gap-3 border-t border-white/10 py-6 text-sm text-white/45 sm:flex-row sm:justify-between">
        <p>
          © {year} {company.name}. {t.footer.rights}
        </p>
        <p className="flex gap-5">
          {company.kvk && <span>{t.common.kvk}: {company.kvk}</span>}
          {company.vat && <span>{t.common.vat}: {company.vat}</span>}
        </p>
      </div>
    </footer>
  );
}
