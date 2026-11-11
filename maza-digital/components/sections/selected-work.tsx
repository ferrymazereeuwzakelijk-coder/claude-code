import Link from "next/link";
import type { Dictionary } from "@/content/dictionaries";
import { visibleProjects } from "@/content/projects";
import { href, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/projects/project-card";
import { SectionHeading } from "./section-heading";

export function SelectedWork({ locale, dict }: { locale: Locale; dict: Dictionary["work"] }) {
  // Verified projects first; the homepage shows up to four.
  const items = [...visibleProjects].sort((a, b) => Number(b.verified) - Number(a.verified)).slice(0, 4);

  return (
    <section id="work" aria-labelledby="work-title" className="scroll-mt-24 border-t border-line py-24 md:py-36">
      <div className="container-x">
        <SectionHeading id="work-title" title={dict.title} intro={dict.intro}>
          <Button asChild variant="outline" className="mt-6">
            <Link href={href(locale, "/projects")}>{dict.all}</Link>
          </Button>
        </SectionHeading>

        {items.length === 0 ? (
          <div className="mt-16 flex flex-col gap-6 rounded-xl border border-line bg-ink-2 p-8 md:flex-row md:items-center md:justify-between md:p-12">
            <p className="type-lead">{dict.portfolioPending}</p>
            <Button asChild variant="accent" className="shrink-0">
              <Link href={href(locale, "/contact")}>{dict.portfolioPendingCta}</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-16 grid gap-x-8 gap-y-20 md:grid-cols-12">
            {items.map((p, i) => (
              <div
                key={p.slug}
                className={cn(
                  i === 0 && "md:col-span-12",
                  i === 1 && "md:col-span-7",
                  i === 2 && "md:col-span-5 md:mt-32",
                  i === 3 && "md:col-span-8 md:col-start-3",
                )}
              >
                <ProjectCard project={p} locale={locale} dict={dict} large={i === 0} priority={i === 0} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
