import Link from "next/link";
import type { Dictionary } from "@/content/dictionaries";
import { services } from "@/content/services";
import { site, whatsappHref, type SocialKey } from "@/content/site";
import { href, t, type Locale } from "@/lib/i18n";
import { LogoMark } from "./logo";

const socialLabels: Record<SocialKey, string> = { linkedin: "LinkedIn", instagram: "Instagram", github: "GitHub" };

export function Footer({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const f = dict.footer;
  const socials = (Object.entries(site.socials) as [SocialKey, string][]).filter(([, url]) => Boolean(url));
  const wa = whatsappHref();
  const year = new Date().getFullYear();

  const nav = [
    { label: dict.nav.services, href: href(locale, "/services") },
    { label: dict.nav.projects, href: href(locale, "/projects") },
    { label: dict.nav.about, href: href(locale, "/about") },
    { label: dict.nav.contact, href: href(locale, "/contact") },
  ];

  return (
    <footer className="relative border-t border-line bg-ink">
      <div className="container-x grid gap-14 py-20 md:grid-cols-12">
        <div className="md:col-span-4">
          <div className="flex items-center gap-3 font-display font-semibold text-white">
            <LogoMark />
            {site.brandName}
          </div>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-mist">{f.tagline}</p>
        </div>

        <div className="md:col-span-3">
          <h2 className="text-sm font-medium tracking-normal text-white">{f.services}</h2>
          <ul className="mt-5 space-y-3 text-sm">
            {services.map((s) => (
              <li key={s.slug}>
                <Link href={href(locale, `/services/${s.slug}`)} className="text-mist transition-colors hover:text-white">
                  {t(s.title, locale)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-2">
          <h2 className="text-sm font-medium tracking-normal text-white">{f.navigation}</h2>
          <ul className="mt-5 space-y-3 text-sm">
            {nav.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="text-mist transition-colors hover:text-white">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-3">
          <h2 className="text-sm font-medium tracking-normal text-white">{f.contact}</h2>
          <ul className="mt-5 space-y-3 text-sm">
            <li>
              <a href={`mailto:${site.email}`} className="text-white underline-offset-4 hover:underline">
                {site.email}
              </a>
            </li>
            {wa && (
              <li>
                <a href={wa} target="_blank" rel="noopener noreferrer" className="text-mist hover:text-white">
                  WhatsApp
                </a>
              </li>
            )}
            {socials.map(([key, url]) => (
              <li key={key}>
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-mist hover:text-white">
                  {socialLabels[key]}
                </a>
              </li>
            ))}
            <li className="text-mist">{t(site.location, locale)}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-x flex flex-col gap-3 py-6 text-xs text-mist md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {site.legal.companyName}. {f.rights}
            {site.legal.kvk && <span className="ml-3">{f.kvk} {site.legal.kvk}</span>}
            {site.legal.vat && <span className="ml-3">{f.vat} {site.legal.vat}</span>}
          </p>
          <nav aria-label={f.legal}>
            <Link href={href(locale, "/privacy")} className="hover:text-white">
              {f.privacy}
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
