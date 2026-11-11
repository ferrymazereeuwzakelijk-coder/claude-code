import { cn } from "@/lib/utils";
import { Reveal } from "@/components/motion/reveal";

export function SectionHeading({
  title,
  intro,
  id,
  className,
  children,
}: {
  title: string;
  intro?: string;
  id?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("grid gap-8 md:grid-cols-12 md:items-end", className)}>
      <Reveal className="md:col-span-7">
        <h2 id={id} className="type-section">
          {title}
        </h2>
      </Reveal>
      {(intro || children) && (
        <div className="md:col-span-5 md:pb-2">
          {intro && <p className="type-lead">{intro}</p>}
          {children}
        </div>
      )}
    </div>
  );
}
