import { cn } from "@/lib/utils";

/** Consistent opening block for inner pages. */
export function PageHeader({
  title,
  intro,
  kicker,
  className,
  children,
}: {
  title: string;
  intro?: string;
  kicker?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className={cn("relative isolate overflow-hidden pb-16 pt-40 md:pb-24 md:pt-52", className)}>
      <div aria-hidden className="glow-blue pointer-events-none absolute -right-[15%] -top-[30%] -z-10 h-[80vh] w-[60vw]" />
      <div className="container-x">
        {kicker && <div className="mb-8 text-sm text-mist">{kicker}</div>}
        <h1 className="font-display text-[clamp(2.75rem,8vw,7.5rem)] font-semibold leading-[0.92] tracking-[-0.05em] text-balance">
          {title}
        </h1>
        {intro && <p className="type-lead mt-8">{intro}</p>}
        {children}
      </div>
    </section>
  );
}
