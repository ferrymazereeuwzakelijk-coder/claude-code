import { site } from "@/content/site";

/** Small pill on every demo: makes clear it's a demo and links back to the case. */
export function DemoBadge({ slug, dark = false }: { slug: string; dark?: boolean }) {
  return (
    // target="_top": when the demo is embedded on a case page, leave the frame.
    <a
      href={`/nl/projects/${slug}`}
      target="_top"
      data-demo-badge
      className={`fixed bottom-4 left-4 z-[100] flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium shadow-lg backdrop-blur ${
        dark ? "bg-white/90 text-neutral-900" : "bg-neutral-900/90 text-white"
      }`}
    >
      <span className="size-1.5 rounded-full bg-emerald-400" />
      Demo · gebouwd door {site.brandName}
    </a>
  );
}
