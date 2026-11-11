import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/content/dictionaries";
import { getProject, isProjectIndexable, visibleProjects } from "@/content/projects";
import { getService } from "@/content/services";
import { href, isLocale, locales, t } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { categoryLabel } from "@/components/projects/project-card";
import { ProjectVisual } from "@/components/projects/project-visual";
import { ClosingCta } from "@/components/sections/cta";

type Props = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  return locales.flatMap((locale) => visibleProjects.map((p) => ({ locale, slug: p.slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const project = getProject(slug);
  if (!isLocale(locale) || !project) return {};
  return {
    ...pageMetadata({ locale, path: `/projects/${slug}`, title: project.name, description: t(project.summary, locale) }),
    // Unverified client drafts must never be indexed.
    robots: isProjectIndexable(project) ? undefined : { index: false, follow: false },
  };
}

export default async function ProjectPage({ params }: Props) {
  const { locale, slug } = await params;
  const project = getProject(slug);
  if (!isLocale(locale) || !project) notFound();
  const dict = getDictionary(locale);
  const w = dict.work;

  const idx = visibleProjects.findIndex((p) => p.slug === project.slug);
  const nextProject = visibleProjects.length > 1 ? visibleProjects[(idx + 1) % visibleProjects.length] : undefined;

  const concept = project.kind === "concept";
  const sections = [
    { title: concept ? w.contextConcept : w.context, body: t(project.caseStudy.context, locale) },
    { title: concept ? w.approachConcept : w.approach, body: t(project.caseStudy.approach, locale) },
    { title: concept ? w.outcomeConcept : w.outcome, body: t(project.caseStudy.outcome, locale) },
  ];

  return (
    <>
      <section className="pb-12 pt-40 md:pt-52">
        <div className="container-x">
          <Link href={href(locale, "/projects")} className="text-sm text-mist hover:text-white">
            {w.back}
          </Link>
          {concept ? (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Badge variant="accent">{w.conceptBadge}</Badge>
              <p className="text-sm text-mist">{w.conceptNote}</p>
            </div>
          ) : (
            !project.verified && (
              <div className="mt-6">
                <Badge variant="warning">{w.placeholderBadge}</Badge>
              </div>
            )
          )}
          <h1 className="mt-8 font-display text-[clamp(3rem,10vw,9rem)] font-semibold leading-[0.9] tracking-[-0.055em]">
            {project.name}
          </h1>
          <div className="mt-10 grid gap-10 md:grid-cols-12">
            <p className="type-lead md:col-span-7">{t(project.summary, locale)}</p>
            <dl className="grid grid-cols-2 gap-6 text-sm md:col-span-4 md:col-start-9">
              <div>
                <dt className="text-mist">{w.category}</dt>
                <dd className="mt-1 text-white">{categoryLabel(project, locale)}</dd>
              </div>
              {project.year && (
                <div>
                  <dt className="text-mist">{w.year}</dt>
                  <dd className="mt-1 text-white">{project.year}</dd>
                </div>
              )}
              <div className="col-span-2">
                <dt className="text-mist">{w.services}</dt>
                <dd className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                  {project.services.map((slug) => {
                    const svc = getService(slug);
                    return svc ? (
                      <Link key={slug} href={href(locale, `/services/${slug}`)} className="text-white underline-offset-4 hover:underline">
                        {t(svc.title, locale)}
                      </Link>
                    ) : null;
                  })}
                </dd>
              </div>
            </dl>
          </div>
          {project.liveUrl && (
            <Button asChild variant="outline" className="mt-10">
              <a href={project.liveUrl} target="_blank" rel="noopener noreferrer">
                {w.visit}
              </a>
            </Button>
          )}
        </div>
      </section>

      <section className="pb-20">
        <div className="container-x">
          <ProjectVisual project={project} pendingLabel={w.screenshotPending} priority sizes="100vw" className="md:aspect-[16/8]" />
        </div>
      </section>

      <section className="border-t border-line py-20 md:py-28">
        <div className="container-x space-y-16">
          {sections.map((s) => (
            <div key={s.title} className="grid gap-6 md:grid-cols-12">
              <h2 className="text-2xl font-semibold tracking-[-0.03em] md:col-span-4 md:text-3xl">{s.title}</h2>
              <p className="type-lead md:col-span-7 md:col-start-6">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {nextProject && (
        <section className="border-t border-line">
          <Link href={href(locale, `/projects/${nextProject.slug}`)} className="group block py-20 md:py-28">
            <div className="container-x">
              <p className="text-sm text-mist">{w.next}</p>
              <p className="mt-4 font-display text-[clamp(2.5rem,7vw,6rem)] font-semibold leading-none tracking-[-0.05em] text-mist transition-colors duration-500 group-hover:text-white">
                {nextProject.name}
              </p>
            </div>
          </Link>
        </section>
      )}

      <ClosingCta locale={locale} dict={dict.cta} />
    </>
  );
}
