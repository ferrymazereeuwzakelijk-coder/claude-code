import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary } from "@/content/dictionaries";
import { visibleProjects } from "@/content/projects";
import { isLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/layout/page-header";
import { ProjectFilter } from "@/components/projects/project-filter";
import { ClosingCta } from "@/components/sections/cta";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const d = getDictionary(locale).meta;
  return pageMetadata({ locale, path: "/projects", title: d.projectsTitle, description: d.projectsDescription });
}

export default async function ProjectsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const items = [...visibleProjects].sort((a, b) => Number(b.verified) - Number(a.verified));

  return (
    <>
      <PageHeader title={dict.work.title} intro={dict.work.intro} />
      <section aria-label={dict.work.title} className="pb-24 md:pb-36">
        <div className="container-x">
          {items.length === 0 ? (
            <p className="type-lead rounded-xl border border-line bg-ink-2 p-8 md:p-12">{dict.work.portfolioPending}</p>
          ) : (
            <ProjectFilter projects={items} locale={locale} dict={dict.work} />
          )}
        </div>
      </section>
      <ClosingCta locale={locale} dict={dict.cta} />
    </>
  );
}
