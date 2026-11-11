import type { Localized } from "@/lib/i18n";

export type ProjectCategory = "website" | "marketplace" | "app" | "software" | "ai" | "game";

export const projectCategories: { key: ProjectCategory; label: Localized }[] = [
  { key: "website", label: { nl: "Websites", en: "Websites" } },
  { key: "marketplace", label: { nl: "Marktplaatsen", en: "Marketplaces" } },
  { key: "app", label: { nl: "Apps", en: "Apps" } },
  { key: "software", label: { nl: "Software", en: "Software" } },
  { key: "ai", label: { nl: "AI", en: "AI" } },
  { key: "game", label: { nl: "Games", en: "Games" } },
];

export type Project = {
  slug: string;
  name: string;
  /**
   * Set to true ONLY after Ferry confirms the project is his and may be shown.
   * Unverified projects are hidden in production (see isProjectVisible).
   */
  verified: boolean;
  category: ProjectCategory;
  /** Related service slugs from content/services.ts */
  services: string[];
  year?: string;
  /** Public URL — only add when the site is live and may be linked. */
  liveUrl?: string;
  /**
   * Path in /public/projects, e.g. "/projects/crewingmarket.webp".
   * Leave null until a real screenshot is supplied. Never use stock images.
   */
  screenshot: string | null;
  /** Accent used for the placeholder visual until a screenshot exists. */
  accent: string;
  summary: Localized;
  /**
   * Case study body. Write only what is true and approved.
   * Do not add metrics or client quotes unless they are verified and approved.
   */
  caseStudy: {
    context: Localized;
    approach: Localized;
    outcome: Localized;
  };
};

const pending: Localized = {
  nl: "Nog in te vullen na verificatie.",
  en: "To be completed after verification.",
};

export const projects: Project[] = [
  {
    slug: "mazamarketing",
    name: "MazaMarketing",
    verified: false, // TODO: confirm
    category: "website",
    services: ["websites"],
    screenshot: null,
    accent: "#4B7BFF",
    summary: {
      nl: "Concepttekst: eigen marketingmerk en website. Bevestig scope en inhoud voordat dit project zichtbaar wordt.",
      en: "Draft copy: own marketing brand and website. Confirm scope and content before this project goes public.",
    },
    caseStudy: { context: pending, approach: pending, outcome: pending },
  },
  {
    slug: "crewingmarket",
    name: "CrewingMarket",
    verified: false, // TODO: confirm
    category: "marketplace",
    services: ["platforms"],
    screenshot: null,
    accent: "#8066FF",
    summary: {
      nl: "Concepttekst: marktplaats rond crewing en personeel. Bevestig doelgroep, functies en jouw rol.",
      en: "Draft copy: marketplace around crewing and staffing. Confirm audience, features and your role.",
    },
    caseStudy: { context: pending, approach: pending, outcome: pending },
  },
  {
    slug: "tugmarket",
    name: "TugMarket",
    verified: false, // TODO: confirm
    category: "marketplace",
    services: ["platforms"],
    screenshot: null,
    accent: "#3FA7FF",
    summary: {
      nl: "Concepttekst: marktplaats voor sleepboten. Bevestig doelgroep, functies en jouw rol.",
      en: "Draft copy: marketplace for tugboats. Confirm audience, features and your role.",
    },
    caseStudy: { context: pending, approach: pending, outcome: pending },
  },
  {
    slug: "bargemarket",
    name: "BargeMarket",
    verified: false, // TODO: confirm
    category: "marketplace",
    services: ["platforms"],
    screenshot: null,
    accent: "#5E6BFF",
    summary: {
      nl: "Concepttekst: marktplaats voor binnenvaart en barges. Bevestig doelgroep, functies en jouw rol.",
      en: "Draft copy: marketplace for inland shipping and barges. Confirm audience, features and your role.",
    },
    caseStudy: { context: pending, approach: pending, outcome: pending },
  },
  {
    slug: "supplymarket",
    name: "SupplyMarket",
    verified: false, // TODO: confirm
    category: "marketplace",
    services: ["platforms"],
    screenshot: null,
    accent: "#9A7BFF",
    summary: {
      nl: "Concepttekst: marktplaats voor leveranciers en supplies. Bevestig doelgroep, functies en jouw rol.",
      en: "Draft copy: marketplace for suppliers and supplies. Confirm audience, features and your role.",
    },
    caseStudy: { context: pending, approach: pending, outcome: pending },
  },
  {
    slug: "project-placeholder",
    name: "Volgend project",
    verified: false, // Template record — duplicate for each new project
    category: "app",
    services: ["apps"],
    screenshot: null,
    accent: "#6A87C9",
    summary: {
      nl: "Sjabloon voor een nieuw project. Kopieer dit record en vul het in.",
      en: "Template for a new project. Copy this record and fill it in.",
    },
    caseStudy: { context: pending, approach: pending, outcome: pending },
  },
];

const showUnverified =
  process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_SHOW_UNVERIFIED_PROJECTS === "true";

export function isProjectVisible(p: Project): boolean {
  return p.verified || showUnverified;
}

export const visibleProjects = projects.filter(isProjectVisible);

export function getProject(slug: string): Project | undefined {
  return visibleProjects.find((p) => p.slug === slug);
}
