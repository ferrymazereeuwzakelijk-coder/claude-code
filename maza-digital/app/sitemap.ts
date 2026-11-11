import type { MetadataRoute } from "next";
import { visibleProjects } from "@/content/projects";
import { services } from "@/content/services";
import { site } from "@/content/site";
import { locales } from "@/lib/i18n";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "",
    "/services",
    ...services.map((s) => `/services/${s.slug}`),
    "/projects",
    // Only verified projects are indexed, even on preview deployments.
    ...visibleProjects.filter((p) => p.verified).map((p) => `/projects/${p.slug}`),
    "/about",
    "/contact",
    "/privacy",
  ];
  const now = new Date();

  return paths.map((path) => ({
    url: `${site.url}/nl${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "monthly" : "yearly",
    priority: path === "" ? 1 : path === "/contact" ? 0.9 : 0.7,
    alternates: {
      languages: Object.fromEntries(locales.map((l) => [l, `${site.url}/${l}${path}`])),
    },
  }));
}
