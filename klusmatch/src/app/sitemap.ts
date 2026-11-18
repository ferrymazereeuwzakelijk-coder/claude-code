import type { MetadataRoute } from 'next';
import { sql } from '@/lib/db';
import { env } from '@/lib/env';
import { listCategories } from '@/lib/categories';
import { CITIES } from '@/lib/seo';

export const dynamic = 'force-dynamic'; // reads the database; never at build time

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env().APP_BASE_URL.replace(/\/$/, '');
  const categories = await listCategories(sql());
  const profiles = await sql()<{ user_id: string; updated_at: Date }[]>`
    select user_id, updated_at from contractor_profiles where verification = 'verified'`;
  return [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/voor-vakmensen`, changeFrequency: 'daily', priority: 0.9 },
    ...categories.map((c) => ({ url: `${base}/voor-vakmensen/${c.slug}`, changeFrequency: 'daily' as const, priority: 0.7 })),
    ...categories.flatMap((c) => CITIES.map((city) => ({ url: `${base}/klus/${c.slug}/${city.slug}`, changeFrequency: 'weekly' as const, priority: 0.6 }))),
    ...profiles.map((p) => ({ url: `${base}/vakmensen/${p.user_id}`, lastModified: p.updated_at, changeFrequency: 'weekly' as const, priority: 0.5 })),
    { url: `${base}/voorwaarden`, priority: 0.1 },
    { url: `${base}/privacy`, priority: 0.1 },
  ];
}
