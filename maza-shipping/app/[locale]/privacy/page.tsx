import type { Metadata } from "next";
import { getDictionary } from "@/content/dictionaries";
import { isLocale, defaultLocale, localeTags, type Locale } from "@/content/i18n";
import { company } from "@/content/site";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

const UPDATED = "2026-11-11";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale as Locale, "privacy", "privacy");
}

export default async function PrivacyPage({ params }: Props) {
  const { locale: l } = await params;
  const locale = (isLocale(l) ? l : defaultLocale) as Locale;
  const t = getDictionary(locale).privacy;
  return (
    <>
      <div className="h-[88px] bg-navy" />
      <article id="content" className="container-x max-w-3xl py-20 sm:py-28">
        <h1 className="text-4xl font-extrabold text-navy sm:text-5xl">{t.title}</h1>
        <p className="mt-4 text-sm text-slate">
          {t.updated}: {new Date(UPDATED).toLocaleDateString(localeTags[locale].bcp47, { dateStyle: "long" })}
        </p>
        {t.sections.map((s) => (
          <section key={s.h} className="mt-10">
            <h2 className="text-xl font-bold text-navy">{s.h}</h2>
            <p className="mt-3 leading-relaxed text-slate">{s.p}</p>
          </section>
        ))}
        <p className="mt-12 border-t border-line pt-6 text-sm text-slate">
          {company.name} · {company.address.street}, {company.address.postalCode} {company.address.city} · {company.email}
        </p>
      </article>
    </>
  );
}
