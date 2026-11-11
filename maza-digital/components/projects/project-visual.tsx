import Image from "next/image";
import type { Project } from "@/content/projects";
import { cn } from "@/lib/utils";
import { ConceptMockup } from "./concept-mockup";

/**
 * Shows the real screenshot when one is supplied. Until then, a neutral
 * framed placeholder that clearly reads as "screenshot pending" — never a fake UI
 * that could be mistaken for the actual product.
 */
export function ProjectVisual({
  project,
  pendingLabel,
  priority = false,
  className,
  sizes = "(min-width: 1024px) 50vw, 100vw",
}: {
  project: Project;
  pendingLabel: string;
  priority?: boolean;
  className?: string;
  sizes?: string;
}) {
  return (
    <div className={cn("relative aspect-[16/10] overflow-hidden rounded-lg border border-line bg-ink", className)}>
      {project.screenshot ? (
        <Image
          src={project.screenshot}
          alt={`${project.name} screenshot`}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover object-top transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-[1.03]"
        />
      ) : project.mockup ? (
        <ConceptMockup kind={project.mockup} accent={project.accent} />
      ) : (
        <div className="absolute inset-0 flex flex-col">
          <div className="flex items-center gap-1.5 border-b border-line px-4 py-3">
            <span className="size-2 rounded-full bg-white/15" />
            <span className="size-2 rounded-full bg-white/15" />
            <span className="size-2 rounded-full bg-white/15" />
          </div>
          <div
            className="relative flex flex-1 items-center justify-center"
            style={{
              background: `radial-gradient(70% 90% at 70% 20%, ${project.accent}55, transparent 70%), radial-gradient(50% 60% at 10% 100%, ${project.accent}22, transparent 70%)`,
            }}
          >
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.35]"
              style={{
                backgroundImage:
                  "linear-gradient(rgb(255 255 255 / 0.05) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.05) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />
            <div className="relative text-center">
              <p className="font-display text-3xl font-semibold tracking-[-0.04em] text-white md:text-5xl">{project.name}</p>
              <p className="mt-3 text-xs text-mist">{pendingLabel}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
