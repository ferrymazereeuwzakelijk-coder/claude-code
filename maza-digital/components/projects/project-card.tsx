import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Dictionary } from "@/content/dictionaries";
import { projectCategories, type Project } from "@/content/projects";
import { href, t, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tilt } from "@/components/motion/tilt";
import { ProjectVisual } from "./project-visual";

export function categoryLabel(project: Project, locale: Locale): string {
  const cat = projectCategories.find((c) => c.key === project.category);
  return cat ? t(cat.label, locale) : project.category;
}

export function ProjectCard({
  project,
  locale,
  dict,
  large = false,
  priority = false,
}: {
  project: Project;
  locale: Locale;
  dict: Dictionary["work"];
  large?: boolean;
  priority?: boolean;
}) {
  return (
    <article className="group relative">
      <Link href={href(locale, `/projects/${project.slug}`)} className="block" aria-label={`${project.name}: ${dict.view}`}>
        <Tilt max={5}>
          <ProjectVisual
            project={project}
            pendingLabel={dict.screenshotPending}
            priority={priority}
            className={cn("transition-[border-color] duration-500 group-hover:border-line-strong", large && "md:aspect-[16/9]")}
          />
        </Tilt>
      </Link>
      <div className="mt-6 flex items-start justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-mist">
            <span>{categoryLabel(project, locale)}</span>
            {project.year && <span>{project.year}</span>}
            {project.kind === "concept" ? (
              <Badge variant="accent">{dict.conceptBadge}</Badge>
            ) : (
              !project.verified && <Badge variant="warning">{dict.placeholderBadge}</Badge>
            )}
          </div>
          <h3 className={cn("mt-2 font-semibold tracking-[-0.03em]", large ? "text-3xl md:text-4xl" : "text-2xl")}>
            <Link href={href(locale, `/projects/${project.slug}`)} className="after:absolute after:inset-0 after:content-['']">
              {project.name}
            </Link>
          </h3>
          <p className="mt-3 max-w-xl text-[0.9375rem] leading-relaxed text-mist">{t(project.summary, locale)}</p>
        </div>
        <ArrowUpRight
          aria-hidden
          className="mt-8 size-5 shrink-0 text-mist transition-[transform,color] duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white"
        />
      </div>
      {project.liveUrl && (
        <a
          href={project.liveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="relative z-10 mt-4 inline-block text-sm text-white underline underline-offset-4 hover:text-blue"
        >
          {dict.visit}
        </a>
      )}
    </article>
  );
}
