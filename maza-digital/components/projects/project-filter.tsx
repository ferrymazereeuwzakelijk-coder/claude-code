"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Dictionary } from "@/content/dictionaries";
import { projectCategories, type Project, type ProjectCategory } from "@/content/projects";
import { t, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ProjectCard } from "./project-card";

export function ProjectFilter({ projects, locale, dict }: { projects: Project[]; locale: Locale; dict: Dictionary["work"] }) {
  const [active, setActive] = useState<ProjectCategory | "all">("all");
  const reduce = useReducedMotion();

  // Only offer categories that actually have projects.
  const available = projectCategories.filter((c) => projects.some((p) => p.category === c.key));
  const filtered = useMemo(
    () => (active === "all" ? projects : projects.filter((p) => p.category === active)),
    [active, projects],
  );

  const options: { key: ProjectCategory | "all"; label: string; count: number }[] = [
    { key: "all", label: dict.filterAll, count: projects.length },
    ...available.map((c) => ({
      key: c.key,
      label: t(c.label, locale),
      count: projects.filter((p) => p.category === c.key).length,
    })),
  ];

  return (
    <div>
      <div role="group" aria-label={dict.filterLabel} className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => setActive(o.key)}
            aria-pressed={active === o.key}
            className={cn(
              "rounded-full border px-4 py-2 text-sm transition-colors",
              active === o.key ? "border-white bg-white text-ink" : "border-line text-fog hover:border-line-strong hover:text-white",
            )}
          >
            {o.label}
            <span className={cn("ml-2 tabular-nums", active === o.key ? "text-ink/60" : "text-mist")}>{o.count}</span>
          </button>
        ))}
      </div>

      <p className="sr-only" aria-live="polite">
        {filtered.length}
      </p>

      {filtered.length === 0 ? (
        <p className="mt-12 text-mist">{dict.empty}</p>
      ) : (
        <motion.ul layout={!reduce} className="mt-12 grid gap-x-8 gap-y-16 md:grid-cols-2">
          <AnimatePresence mode="popLayout" initial={false}>
            {filtered.map((p) => (
              <motion.li
                key={p.slug}
                layout={!reduce}
                initial={reduce ? false : { opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <ProjectCard project={p} locale={locale} dict={dict} />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
    </div>
  );
}
