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
   * "client": real work (yours or for a client). Needs `verified: true` to be public.
   * "concept": a working demo product with a fictional brand, always labelled "Demo".
   * Concepts never claim a client, metrics or quotes.
   */
  kind: "client" | "concept";
  /** Path of the live, clickable demo, e.g. "/demo/kadeboek". */
  demoUrl?: string;
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
    slug: "kadeboek",
    name: "Kadeboek",
    kind: "concept",
    demoUrl: "/demo/kadeboek",
    verified: false,
    category: "software",
    services: ["platforms", "websites"],
    screenshot: "/projects/kadeboek.webp",
    accent: "#3FA7FF",
    summary: {
      nl: "Online ligplaatsen boeken en betalen bij een jachthaven, met een live kaart van de steigers en automatische bevestigingen.",
      en: "Booking and paying for marina berths online, with a live map of the jetties and automatic confirmations.",
    },
    caseStudy: {
      context: {
        nl: "Een middelgrote jachthaven regelt passantenplaatsen via telefoon, mail en een whiteboard in het havenkantoor. In het hoogseizoen betekent dat dubbele boekingen, gemiste oproepen en een havenmeester die meer achter de telefoon zit dan op de steiger.",
        en: "A mid-sized marina handles visitor berths by phone, email and a whiteboard in the harbour office. In high season that means double bookings, missed calls and a harbour master who spends more time on the phone than on the jetty.",
      },
      approach: {
        nl: "Een boekingsplatform rond een interactieve havenkaart: schippers kiezen datum, bootlengte en diepgang en zien direct welke plekken passen. Betalen gaat via iDEAL, de bevestiging met toegangscode komt per mail. De havenmeester krijgt een dagoverzicht op de tablet en kan plekken met één tik verplaatsen.",
        en: "A booking platform built around an interactive harbour map: skippers choose dates, boat length and draught and immediately see which berths fit. Payment runs through iDEAL, the confirmation with access code arrives by email. The harbour master gets a daily overview on a tablet and can move berths with one tap.",
      },
      outcome: {
        nl: "Minder telefoonverkeer, geen dubbele boekingen meer en vooraf betaalde plekken. De havenmeester ziet in één oogopslag wie er vandaag aankomt.",
        en: "Fewer phone calls, no more double bookings and berths paid in advance. The harbour master sees at a glance who arrives today.",
      },
    },
  },
  {
    slug: "veldwerk",
    name: "Veldwerk",
    kind: "concept",
    demoUrl: "/demo/veldwerk",
    verified: false,
    category: "app",
    services: ["apps", "software"],
    screenshot: "/projects/veldwerk.webp",
    accent: "#8066FF",
    summary: {
      nl: "Een app voor monteurs: werkbonnen, foto's, materiaal en een handtekening van de klant, ook zonder bereik.",
      en: "An app for field technicians: work orders, photos, materials and a customer signature, even without signal.",
    },
    caseStudy: {
      context: {
        nl: "Een installatiebedrijf met twaalf monteurs werkt met papieren werkbonnen. Die komen dagen later binnen, zijn soms onleesbaar en facturen gaan daardoor pas na weken de deur uit.",
        en: "An installation company with twelve technicians uses paper work orders. They come in days later, are sometimes illegible, and invoices therefore go out weeks late.",
      },
      approach: {
        nl: "Een mobiele app die offline werkt en synchroniseert zodra er bereik is. De monteur ziet zijn dagplanning, vinkt taken af, maakt foto's, boekt materiaal uit de bus en laat de klant tekenen op het scherm. Kantoor ziet de bon direct binnenkomen in een webdashboard en zet hem met één klik door naar de boekhouding.",
        en: "A mobile app that works offline and syncs as soon as there's signal. The technician sees the day's schedule, ticks off tasks, takes photos, books materials from the van and has the customer sign on screen. The office sees the order arrive instantly in a web dashboard and sends it to accounting in one click.",
      },
      outcome: {
        nl: "Werkbonnen zijn binnen minuten compleet op kantoor in plaats van na dagen, en facturen kunnen dezelfde dag verstuurd worden.",
        en: "Work orders reach the office complete within minutes instead of days, and invoices can go out the same day.",
      },
    },
  },
  {
    slug: "stroomlijn",
    name: "Stroomlijn",
    kind: "concept",
    demoUrl: "/demo/stroomlijn",
    verified: false,
    category: "ai",
    services: ["ai"],
    screenshot: "/projects/stroomlijn.webp",
    accent: "#5E6BFF",
    summary: {
      nl: "AI leest binnenkomende offerteaanvragen, haalt de belangrijke gegevens eruit en zet een conceptofferte klaar in het CRM.",
      en: "AI reads incoming quote requests, extracts the key details and prepares a draft quote in the CRM.",
    },
    caseStudy: {
      context: {
        nl: "Een groothandel krijgt dagelijks tientallen aanvragen per mail, in alle vormen: losse zinnen, pdf's, foto's van briefjes. Een binnendienstmedewerker is uren bezig met overtypen voordat er ook maar één offerte gemaakt is.",
        en: "A wholesaler receives dozens of requests by email every day, in every shape: loose sentences, PDFs, photos of notes. An inside-sales employee spends hours retyping before a single quote is made.",
      },
      approach: {
        nl: "Een koppeling tussen mailbox, een AI-model en het CRM. Elke aanvraag wordt uitgelezen: klant, producten, aantallen en gewenste leverdatum. Bij twijfel markeert het systeem de aanvraag voor controle in plaats van te gokken. De medewerker keurt de conceptofferte goed of past hem aan.",
        en: "An integration between the mailbox, an AI model and the CRM. Every request is parsed: customer, products, quantities and requested delivery date. When in doubt the system flags the request for review instead of guessing. The employee approves or adjusts the draft quote.",
      },
      outcome: {
        nl: "Het overtypen verdwijnt. De medewerker controleert en verstuurt, en klanten krijgen sneller een offerte.",
        en: "The retyping disappears. The employee reviews and sends, and customers get their quote faster.",
      },
    },
  },
  {
    slug: "korrel",
    name: "Korrel",
    kind: "concept",
    demoUrl: "/demo/korrel",
    verified: false,
    category: "website",
    services: ["ecommerce", "websites"],
    screenshot: "/projects/korrel.webp",
    accent: "#FF9F5A",
    summary: {
      nl: "Webshop voor een ambachtelijke bakkerij: vandaag bestellen, morgen ophalen op een gekozen tijdslot.",
      en: "Webshop for an artisan bakery: order today, pick up tomorrow in a chosen time slot.",
    },
    caseStudy: {
      context: {
        nl: "Een bakkerij met twee vestigingen neemt bestellingen voor taarten en broodpakketten aan via telefoon en Instagram. In het weekend leidt dat tot lange rijen, vergeten bestellingen en verspilling aan het einde van de dag.",
        en: "A bakery with two shops takes orders for cakes and bread bundles by phone and Instagram. At weekends that leads to long queues, forgotten orders and waste at the end of the day.",
      },
      approach: {
        nl: "Een webshop met grote productfoto's, een slimme afhaalplanner per vestiging en een dagelijkse bestellijst voor de bakkers, gesorteerd op product en tijdslot. Producten zijn automatisch uitverkocht als de productiecapaciteit voor die dag vol is.",
        en: "A webshop with large product photos, a smart pickup planner per shop and a daily order list for the bakers, sorted by product and time slot. Products sell out automatically once that day's production capacity is full.",
      },
      outcome: {
        nl: "Bestellingen komen gestructureerd binnen, de bakkers weten 's ochtends precies wat er nodig is en klanten halen op zonder wachtrij.",
        en: "Orders come in structured, the bakers know each morning exactly what's needed and customers pick up without queuing.",
      },
    },
  },
  {
    slug: "vlootzicht",
    name: "Vlootzicht",
    kind: "concept",
    demoUrl: "/demo/vlootzicht",
    verified: false,
    category: "software",
    services: ["software"],
    screenshot: "/projects/vlootzicht.webp",
    accent: "#4B7BFF",
    summary: {
      nl: "Dashboard voor een binnenvaartrederij: posities, planning, certificaten en onderhoud van de hele vloot op één scherm.",
      en: "Dashboard for an inland shipping company: positions, planning, certificates and maintenance for the whole fleet on one screen.",
    },
    caseStudy: {
      context: {
        nl: "Een rederij met acht schepen houdt planning, certificaten en onderhoud bij in losse Excel-bestanden. Verlopen certificaten worden soms pas opgemerkt bij een inspectie.",
        en: "A shipping company with eight vessels tracks planning, certificates and maintenance in separate spreadsheets. Expired certificates are sometimes only noticed during an inspection.",
      },
      approach: {
        nl: "Software op maat die AIS-posities, reisplanning en een certificatenregister combineert. Het dashboard toont waar elk schip is, welke reis eraan komt en wat binnenkort verloopt. Waarschuwingen gaan automatisch naar de verantwoordelijke persoon.",
        en: "Custom software that combines AIS positions, voyage planning and a certificate register. The dashboard shows where every vessel is, which voyage is next and what expires soon. Alerts go automatically to the person responsible.",
      },
      outcome: {
        nl: "Eén plek voor de hele vloot, geen verrassingen bij inspecties en een planning die iedereen op kantoor kan inzien.",
        en: "One place for the whole fleet, no surprises during inspections and a schedule everyone in the office can see.",
      },
    },
  },
  {
    slug: "diepte",
    name: "Diepte",
    kind: "concept",
    demoUrl: "/demo/diepte",
    verified: false,
    category: "game",
    services: ["games"],
    screenshot: "/projects/diepte.webp",
    accent: "#2FD4C6",
    summary: {
      nl: "Interactieve browserervaring voor een zeeaquarium: duik met je muis of telefoon steeds dieper en ontdek wat daar leeft.",
      en: "Interactive browser experience for a sea aquarium: dive deeper with your mouse or phone and discover what lives down there.",
    },
    caseStudy: {
      context: {
        nl: "Een aquarium wil scholieren en gezinnen voor het bezoek al nieuwsgierig maken, en een campagne die gedeeld wordt in plaats van weggeklikt.",
        en: "An aquarium wants to get school groups and families curious before their visit, with a campaign that gets shared instead of skipped.",
      },
      approach: {
        nl: "Een 3D-ervaring in de browser zonder installatie. Hoe verder je scrolt, hoe dieper je duikt: het licht verdwijnt, de geluiden veranderen en er verschijnen dieren die bij die diepte horen. Aan het eind staat een quiz met een kortingscode voor een bezoek.",
        en: "A 3D experience in the browser with no install. The further you scroll, the deeper you dive: the light fades, the sounds change and creatures appear that belong at that depth. At the end there's a quiz with a discount code for a visit.",
      },
      outcome: {
        nl: "Een campagne die mensen uit zichzelf delen, met een directe lijn naar ticketverkoop via de kortingscode.",
        en: "A campaign people share on their own, with a direct line to ticket sales through the discount code.",
      },
    },
  },
  {
    slug: "mazamarketing",
    name: "MazaMarketing",
    kind: "client",
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
    kind: "client",
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
    kind: "client",
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
    kind: "client",
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
    kind: "client",
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
    kind: "client",
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
  return p.verified || p.kind === "concept" || showUnverified;
}

/** Real, verified work and labelled concepts may be indexed; draft client records never. */
export function isProjectIndexable(p: Project): boolean {
  return p.verified || p.kind === "concept";
}

export const visibleProjects = projects.filter(isProjectVisible);

export function getProject(slug: string): Project | undefined {
  return visibleProjects.find((p) => p.slug === slug);
}
