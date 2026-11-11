import Image from "next/image";

/**
 * Founder portrait. Drop a real photo at /public/ferry.jpg and set PORTRAIT_SRC.
 * Until then a typographic monogram is shown — no stock photo.
 */
const PORTRAIT_SRC: string | null = null; // e.g. "/ferry.jpg"

export function Portrait({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .filter((p) => /^[A-Z]/.test(p))
    .map((p) => p[0])
    .join("")
    .slice(0, 2);

  return (
    <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-line bg-ink-2">
      {PORTRAIT_SRC ? (
        <Image src={PORTRAIT_SRC} alt={name} fill sizes="(min-width: 768px) 40vw, 100vw" className="object-cover" />
      ) : (
        <>
          <div aria-hidden className="glow-blue absolute -left-1/4 -top-1/4 h-full w-full" />
          <div aria-hidden className="glow-violet absolute -bottom-1/4 -right-1/4 h-full w-full" />
          <div className="absolute inset-0 flex flex-col justify-between p-8">
            <span aria-hidden className="font-display text-[clamp(6rem,16vw,12rem)] font-semibold leading-none tracking-[-0.06em] text-white/90">
              {initials}
            </span>
            <span className="text-sm text-fog">{name}</span>
          </div>
        </>
      )}
    </div>
  );
}
