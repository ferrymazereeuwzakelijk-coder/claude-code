import manifest from './images.json';

/**
 * Site photography (AI-generated mood images, see public/images). Used as illustration only —
 * never presented as real customers, real jobs or testimonials.
 */
export type SiteImage = { src: string; alt: string; width: number; height: number };

const m = manifest as Record<string, { alt: string; width: number; height: number }>;

export function img(file: string): SiteImage {
  const meta = m[file];
  if (!meta) throw new Error(`Unknown image ${file}`);
  return { src: `/images/${file}`, ...meta };
}

/** Photo for a trade category, if one exists. */
export function tradeImage(slug: string): SiteImage | null {
  return m[`trades/${slug}.jpg`] ? img(`trades/${slug}.jpg`) : null;
}
