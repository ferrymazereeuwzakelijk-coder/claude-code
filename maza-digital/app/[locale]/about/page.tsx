import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary } from "@/content/dictionaries";
import { site } from "@/content/site";
import { isLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/layout/page-header";
import { ClosingCta } from "@/components/sections/cta";
import { Portrait } from "@/components/sections/portrait";
import { Process } from "@/components/sections/process";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const d = getDictionary(locale).meta;
  return pageMetadata({ locale, path: "/about", title: d.aboutTitle, description: d.aboutDescription });
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const a = dict.about;

  const personLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: site.founder,
    jobTitle: locale === "nl" ? "Digitaal ondernemer" : "Digital entrepreneur",
    worksFor: { "@type": "Organization", name: site.brandName },
    nationality: "NL",
  };

  return (
    <>
      <PageHeader title={site.founder} intro={a.pageIntro} />

      <section className="pb-20 md:pb-28">
        <div className="container-x grid gap-14 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="md:sticky md:top-28">
              <Portrait name={site.founder} />
            </div>
          </div>
          <div className="space-y-6 md:col-span-6 md:col-start-7">
            <h2 className="type-section">{a.title}</h2>
            <p className="type-lead">{a.body1}</p>
            {a.pageBody.map((p) => (
              <p key={p.slice(0, 24)} className="type-lead">
                {p}
              </p>
            ))}

            <div className="mt-12 rounded-xl border border-line bg-ink-2 p-8">
              <h3 className="text-2xl font-semibold tracking-[-0.03em]">{a.aiTitle}</h3>
              <p className="mt-4 leading-relaxed text-fog">{a.aiBody}</p>
            </div>

            <div className="pt-12">
              <h3 className="text-2xl font-semibold tracking-[-0.03em]">{a.valuesTitle}</h3>
              <ul className="mt-6 divide-y divide-line border-y border-line">
                {a.values.map((v) => (
                  <li key={v.title} className="grid gap-2 py-6 md:grid-cols-[12rem_1fr] md:gap-8">
                    <span className="font-medium text-white">{v.title}</span>
                    <span className="leading-relaxed text-mist">{v.body}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <Process dict={dict.process} />
      <ClosingCta locale={locale} dict={dict.cta} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personLd) }} />
    </>
  );
}
