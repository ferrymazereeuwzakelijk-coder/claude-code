import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  const base = env().APP_BASE_URL.replace(/\/$/, '');
  const production = env().APP_ENV === 'production';
  return {
    // Test and demo deployments must never be indexed.
    rules: production
      ? [{ userAgent: '*', allow: '/', disallow: ['/klant', '/vakman', '/admin', '/meldingen', '/account', '/api', '/dev', '/inloggen'] }]
      : [{ userAgent: '*', disallow: '/' }],
    sitemap: production ? `${base}/sitemap.xml` : undefined,
  };
}
