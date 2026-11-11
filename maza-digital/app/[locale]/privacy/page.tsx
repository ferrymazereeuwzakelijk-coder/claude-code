import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary } from "@/content/dictionaries";
import { privacySections, privacyUpdated } from "@/content/privacy";
import { site } from "@/content/site";
import { isLocale, t } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/layout/page-header";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const d = getDictionary(locale).meta;
  return pageMetadata({ locale, path: "/privacy", title: d.privacyTitle, description: d.privacyTitle });
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const fill = (s: string) => s.replaceAll("{brand}", site.brandName).replaceAll("{email}", site.email);
  const updated = new Intl.DateTimeFormat(locale === "nl" ? "nl-NL" : "en-GB", { dateStyle: "long" }).format(new Date(privacyUpdated));

  return (
    <>
      <PageHeader title={dict.meta.privacyTitle} intro={`${locale === "nl" ? "Laatst bijgewerkt" : "Last updated"}: ${updated}`} />
      <section className="pb-24 md:pb-36">
        <div className="container-x">
          <div className="max-w-3xl space-y-14 border-t border-line pt-14">
            {privacySections.map((s) => (
              <div key={s.title.en}>
                <h2 className="text-2xl font-semibold tracking-[-0.03em]">{t(s.title, locale)}</h2>
                {t(s.body, locale).map((p) => (
                  <p key={p.slice(0, 32)} className="mt-4 leading-relaxed text-fog">
                    {fill(p)}
                  </p>
                ))}
              </div>
            ))}
            {(site.legal.kvk || site.legal.vat) && (
              <p className="text-sm text-mist">
                {site.legal.kvk && <>KvK {site.legal.kvk}. </>}
                {site.legal.vat && <>Btw {site.legal.vat}.</>}
              </p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
