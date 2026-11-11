import type { Localized } from "@/lib/i18n";

export type ServiceIcon = "globe" | "cart" | "smartphone" | "layers" | "sparkles" | "gamepad" | "network";

export type Service = {
  slug: string;
  icon: ServiceIcon;
  /** Shown as one of the six cards on the homepage. */
  onHome: boolean;
  title: Localized;
  /** One line used on cards. */
  short: Localized;
  /** Opening paragraph on the service page. */
  intro: Localized;
  /** Real situations where this service helps a business. */
  useCases: Localized<{ title: string; body: string }[]>;
  deliverables: Localized<string[]>;
  /** Honest scoping notes: what needs evaluation before a commitment. */
  considerations: Localized<string[]>;
  faqs: Localized<{ q: string; a: string }[]>;
};

export const services: Service[] = [
  {
    slug: "websites",
    icon: "globe",
    onHome: true,
    title: { nl: "Websites & webshops", en: "Websites & webshops" },
    short: {
      nl: "Snelle, overtuigende sites die bezoekers omzetten in aanvragen of bestellingen.",
      en: "Fast, persuasive sites that turn visitors into enquiries or orders.",
    },
    intro: {
      nl: "Je website is vaak het eerste gesprek met een klant. Ik bouw sites die snel laden, helder vertellen wat je doet en bezoekers één duidelijke volgende stap geven — van bedrijfssite tot meertalige webshop.",
      en: "Your website is often the first conversation with a customer. I build sites that load fast, explain clearly what you do and give visitors one obvious next step — from company sites to multilingual webshops.",
    },
    useCases: {
      nl: [
        { title: "Een dienstverlener die meer aanvragen wil", body: "Een site rond je beste diensten, met cases, een helder aanvraagformulier en pagina's die vindbaar zijn in Google." },
        { title: "Een merk dat online wil verkopen", body: "Een webshop met productpagina's, betalingen via iDEAL en creditcard, en een beheeromgeving die je zelf kunt bijhouden." },
        { title: "Een verouderde site vernieuwen", body: "Bestaande content en vindbaarheid behouden, terwijl ontwerp, snelheid en structuur naar het niveau van nu gaan." },
      ],
      en: [
        { title: "A service business that wants more enquiries", body: "A site built around your strongest services, with case studies, a clear enquiry form and pages that rank in Google." },
        { title: "A brand that wants to sell online", body: "A webshop with product pages, payments via iDEAL and card, and an admin you can manage yourself." },
        { title: "Rebuilding an outdated site", body: "Keeping existing content and search visibility while design, speed and structure move up to today's standard." },
      ],
    },
    deliverables: {
      nl: ["Strategie en sitestructuur", "Ontwerp op maat voor desktop en mobiel", "CMS of eenvoudig contentbeheer", "Technische SEO en metadata", "Analytics en conversiemeting", "Hosting en livegang"],
      en: ["Strategy and site structure", "Custom design for desktop and mobile", "CMS or simple content editing", "Technical SEO and metadata", "Analytics and conversion tracking", "Hosting and launch"],
    },
    considerations: {
      nl: ["Teksten en beeldmateriaal bepalen een groot deel van het resultaat; die plannen we vanaf het begin mee.", "Bij een migratie brengen we eerst bestaande URL's en rankings in kaart."],
      en: ["Copy and imagery drive much of the result, so we plan them from the start.", "For a migration we first map existing URLs and rankings."],
    },
    faqs: {
      nl: [
        { q: "Kan ik de content zelf aanpassen?", a: "Ja. Afhankelijk van je wensen kies ik een CMS of een eenvoudige beheeromgeving, en je krijgt uitleg hoe het werkt." },
        { q: "Hoe lang duurt een website?", a: "Een compacte bedrijfssite kan binnen enkele weken live, een uitgebreide site of webshop duurt langer. Na het kennismakingsgesprek krijg je een planning op maat." },
      ],
      en: [
        { q: "Can I edit the content myself?", a: "Yes. Depending on your needs I choose a CMS or a simple admin, and I show you how it works." },
        { q: "How long does a website take?", a: "A compact company site can go live within a few weeks; a larger site or webshop takes longer. After the intro call you get a tailored timeline." },
      ],
    },
  },
  {
    slug: "ecommerce",
    icon: "cart",
    onHome: false,
    title: { nl: "E-commerce", en: "E-commerce" },
    short: {
      nl: "Webshops en verkoopflows die bestellen eenvoudig maken.",
      en: "Webshops and sales flows that make buying easy.",
    },
    intro: {
      nl: "Een goede webshop haalt drempels weg: duidelijke producten, een korte checkout en betrouwbare betalingen. Ik bouw shops op Shopify of volledig op maat, afhankelijk van wat jouw assortiment en processen vragen.",
      en: "A good webshop removes friction: clear products, a short checkout and reliable payments. I build shops on Shopify or fully custom, depending on what your range and processes need.",
    },
    useCases: {
      nl: [
        { title: "Starten met online verkopen", body: "Een complete shop met betalingen, verzendopties en btw-instellingen, zodat je snel kunt beginnen." },
        { title: "B2B-bestellingen digitaliseren", body: "Klantspecifieke prijzen, offerteaanvragen en herhaalbestellingen in plaats van mails en spreadsheets." },
        { title: "Koppelen met voorraad en boekhouding", body: "Bestellingen automatisch doorzetten naar je voorraadsysteem of boekhoudpakket, waar een koppeling beschikbaar is." },
      ],
      en: [
        { title: "Starting to sell online", body: "A complete shop with payments, shipping options and VAT settings so you can start quickly." },
        { title: "Digitising B2B orders", body: "Customer-specific pricing, quote requests and repeat orders instead of email and spreadsheets." },
        { title: "Connecting stock and accounting", body: "Orders flow automatically into your inventory or accounting software where an integration is available." },
      ],
    },
    deliverables: {
      nl: ["Platformadvies (Shopify of maatwerk)", "Product- en categoriestructuur", "Checkout en betalingen (o.a. iDEAL via Mollie of Stripe)", "Verzending en btw", "Koppelingen met externe systemen", "Productfeeds en SEO"],
      en: ["Platform advice (Shopify or custom)", "Product and category structure", "Checkout and payments (incl. iDEAL via Mollie or Stripe)", "Shipping and VAT", "Integrations with external systems", "Product feeds and SEO"],
    },
    considerations: {
      nl: ["Koppelingen hangen af van de API's van je huidige systemen; die controleren we vooraf.", "Juridische teksten zoals algemene voorwaarden en retourbeleid lever je zelf of via een jurist aan."],
      en: ["Integrations depend on the APIs of your current systems, which we check up front.", "Legal texts such as terms and returns policy come from you or a lawyer."],
    },
    faqs: {
      nl: [{ q: "Shopify of maatwerk?", a: "Shopify is vaak sneller en voordeliger voor standaard verkoop. Maatwerk loont bij afwijkende prijslogica, configuratoren of complexe B2B-processen. Ik adviseer op basis van jouw situatie." }],
      en: [{ q: "Shopify or custom?", a: "Shopify is often faster and cheaper for standard retail. Custom pays off for unusual pricing logic, configurators or complex B2B processes. I advise based on your situation." }],
    },
  },
  {
    slug: "apps",
    icon: "smartphone",
    onHome: true,
    title: { nl: "Mobiele & webapplicaties", en: "Mobile & web applications" },
    short: {
      nl: "Apps voor klanten of je eigen team, op telefoon en in de browser.",
      en: "Apps for your customers or your own team, on phone and in the browser.",
    },
    intro: {
      nl: "Een app is waardevol als hij een terugkerende taak sneller, eenvoudiger of leuker maakt. Ik ontwikkel webapps en cross-platform mobiele apps (iOS en Android) met één codebase waar dat kan, zodat je sneller live bent en onderhoud overzichtelijk blijft.",
      en: "An app is valuable when it makes a recurring task faster, simpler or more enjoyable. I build web apps and cross-platform mobile apps (iOS and Android) from one codebase where possible, so you launch sooner and maintenance stays manageable.",
    },
    useCases: {
      nl: [
        { title: "Een klantportaal", body: "Klanten zien hun bestellingen, documenten of afspraken op één plek en hoeven minder te bellen of mailen." },
        { title: "Een app voor medewerkers in het veld", body: "Werkbonnen, checklists en foto's direct vanaf de telefoon, ook met wisselend bereik." },
        { title: "Een boekings- of reserveringsapp", body: "Beschikbaarheid, betalingen en herinneringen in één flow, gekoppeld aan je agenda." },
      ],
      en: [
        { title: "A customer portal", body: "Customers see orders, documents or appointments in one place and need to call or email less." },
        { title: "An app for field staff", body: "Work orders, checklists and photos straight from the phone, even with patchy coverage." },
        { title: "A booking app", body: "Availability, payments and reminders in one flow, connected to your calendar." },
      ],
    },
    deliverables: {
      nl: ["Klikbaar prototype", "UX- en interfaceontwerp", "Web- of mobiele app (React / React Native)", "Gebruikersaccounts en rechten", "Koppelingen en notificaties", "Publicatie in App Store en Google Play"],
      en: ["Clickable prototype", "UX and interface design", "Web or mobile app (React / React Native)", "User accounts and permissions", "Integrations and notifications", "Publishing to App Store and Google Play"],
    },
    considerations: {
      nl: ["Apps vragen om testen op echte apparaten en om doorlopend onderhoud na de lancering.", "Publicatie in de app stores is onderworpen aan de regels en reviewtijden van Apple en Google."],
      en: ["Apps need testing on real devices and ongoing maintenance after launch.", "App store publishing is subject to Apple's and Google's rules and review times."],
    },
    faqs: {
      nl: [{ q: "Heb ik een native app nodig of is een webapp genoeg?", a: "Voor veel interne tools en portalen is een webapp genoeg en sneller te bouwen. Een app in de stores is zinvol bij pushnotificaties, offline gebruik of camera- en locatiefuncties. We bepalen dit samen in de ontdekfase." }],
      en: [{ q: "Do I need a native app or is a web app enough?", a: "For many internal tools and portals a web app is enough and faster to build. A store app makes sense for push notifications, offline use or camera and location features. We decide together during discovery." }],
    },
  },
  {
    slug: "software",
    icon: "layers",
    onHome: true,
    title: { nl: "Software op maat & SaaS", en: "Custom software & SaaS" },
    short: {
      nl: "Interne systemen, dashboards en SaaS-producten die passen bij hoe jij werkt.",
      en: "Internal systems, dashboards and SaaS products that fit the way you work.",
    },
    intro: {
      nl: "Als standaardsoftware net niet past, ontstaan er workarounds: dubbel invoeren, losse spreadsheets, handmatige controles. Software op maat sluit aan op je proces. En wil je zelf een SaaS-product in de markt zetten, dan bouwen we eerst een scherpe eerste versie om de vraag te toetsen.",
      en: "When off-the-shelf software doesn't quite fit, workarounds appear: double entry, loose spreadsheets, manual checks. Custom software fits your process. And if you want to launch your own SaaS product, we start with a sharp first version to test demand.",
    },
    useCases: {
      nl: [
        { title: "Spreadsheets vervangen door een systeem", body: "Eén bron van waarheid met rollen, historie en rapportages in plaats van tien versies van hetzelfde bestand." },
        { title: "Een managementdashboard", body: "Cijfers uit verschillende bronnen samengebracht in één overzicht dat dagelijks bijwerkt." },
        { title: "Een SaaS-idee valideren", body: "Een minimaal product met accounts, abonnementen en de kernfunctie, zodat echte gebruikers het kunnen testen." },
      ],
      en: [
        { title: "Replacing spreadsheets with a system", body: "One source of truth with roles, history and reporting instead of ten versions of the same file." },
        { title: "A management dashboard", body: "Figures from multiple sources combined in one overview that updates daily." },
        { title: "Validating a SaaS idea", body: "A minimal product with accounts, subscriptions and the core feature so real users can try it." },
      ],
    },
    deliverables: {
      nl: ["Proces- en datamodel", "Webapplicatie met beheeromgeving", "Rollen, rechten en logging", "Abonnementen en facturatie (Stripe)", "API's en koppelingen", "Documentatie en overdracht"],
      en: ["Process and data model", "Web application with admin", "Roles, permissions and logging", "Subscriptions and billing (Stripe)", "APIs and integrations", "Documentation and handover"],
    },
    considerations: {
      nl: ["Maatwerksoftware vraagt om technische scoping vooraf en om afspraken over hosting, beveiliging en onderhoud.", "Bij gevoelige gegevens stemmen we privacy- en beveiligingseisen vooraf af."],
      en: ["Custom software needs technical scoping up front and agreements on hosting, security and maintenance.", "For sensitive data we agree on privacy and security requirements beforehand."],
    },
    faqs: {
      nl: [{ q: "Ben ik eigenaar van de code?", a: "Ja, tenzij we samen anders afspreken. Je krijgt toegang tot de repository en de documentatie." }],
      en: [{ q: "Do I own the code?", a: "Yes, unless we agree otherwise. You get access to the repository and documentation." }],
    },
  },
  {
    slug: "ai",
    icon: "sparkles",
    onHome: true,
    title: { nl: "AI-automatisering & koppelingen", en: "AI automation & integrations" },
    short: {
      nl: "Repetitief werk automatiseren en systemen met elkaar laten praten.",
      en: "Automating repetitive work and getting systems to talk to each other.",
    },
    intro: {
      nl: "AI is het meest nuttig bij concreet, herhalend werk: documenten verwerken, vragen beantwoorden op basis van je eigen informatie, data overzetten tussen systemen. Ik bouw automatiseringen die controleerbaar blijven, met een mens in de loop waar dat nodig is.",
      en: "AI is most useful for concrete, repetitive work: processing documents, answering questions from your own information, moving data between systems. I build automations that stay auditable, with a human in the loop where it matters.",
    },
    useCases: {
      nl: [
        { title: "Inkomende documenten verwerken", body: "Facturen, offertes of formulieren automatisch uitlezen, controleren en klaarzetten in je systeem." },
        { title: "Een assistent op je eigen kennis", body: "Medewerkers of klanten stellen vragen en krijgen antwoorden op basis van je handleidingen en documentatie, met bronvermelding." },
        { title: "Systemen koppelen", body: "CRM, mail, agenda en boekhouding laten samenwerken zodat gegevens niet meer handmatig worden overgetypt." },
      ],
      en: [
        { title: "Processing incoming documents", body: "Automatically reading, checking and staging invoices, quotes or forms in your system." },
        { title: "An assistant on your own knowledge", body: "Staff or customers ask questions and get answers from your manuals and documentation, with sources." },
        { title: "Connecting systems", body: "Making CRM, email, calendar and accounting work together so data is no longer retyped by hand." },
      ],
    },
    deliverables: {
      nl: ["Analyse van processen en kansen", "Proof of concept op echte voorbeelddata", "AI-workflows en API-koppelingen", "Controlestappen en logging", "Kosten- en kwaliteitsmonitoring"],
      en: ["Process and opportunity analysis", "Proof of concept on real sample data", "AI workflows and API integrations", "Review steps and logging", "Cost and quality monitoring"],
    },
    considerations: {
      nl: ["AI-uitkomsten zijn niet altijd foutloos; daarom testen we op echte voorbeelden en bouwen we controles in.", "Welke data naar welke AI-dienst mag, stemmen we af met je privacy-eisen en de AVG."],
      en: ["AI output is not always error-free, so we test on real examples and build in checks.", "Which data may go to which AI service is aligned with your privacy requirements and the GDPR."],
    },
    faqs: {
      nl: [{ q: "Waar begin ik met AI in mijn bedrijf?", a: "Bij een taak die vaak voorkomt, duidelijke regels heeft en nu veel tijd kost. Een kleine proef laat snel zien of automatisering de moeite waard is." }],
      en: [{ q: "Where do I start with AI in my business?", a: "With a task that happens often, follows clear rules and takes a lot of time today. A small trial quickly shows whether automation is worth it." }],
    },
  },
  {
    slug: "games",
    icon: "gamepad",
    onHome: true,
    title: { nl: "Games & interactieve ervaringen", en: "Games & interactive experiences" },
    short: {
      nl: "Browsergames en interactieve ervaringen voor merken, campagnes en educatie.",
      en: "Browser games and interactive experiences for brands, campaigns and learning.",
    },
    intro: {
      nl: "Interactie blijft beter hangen dan een advertentie. Ik bouw browsergames, configurators en interactieve verhalen die direct werken op telefoon en desktop, zonder app-installatie.",
      en: "Interaction sticks better than an ad. I build browser games, configurators and interactive stories that run instantly on phone and desktop, with no app install.",
    },
    useCases: {
      nl: [
        { title: "Een campagnegame", body: "Een korte game met scorebord of winactie die bezoekers laat spelen en delen." },
        { title: "Een productconfigurator", body: "Klanten stellen een product samen en zien direct het resultaat en de prijs." },
        { title: "Interactief leren", body: "Trainingen en uitleg als speelbare ervaring, voor klanten of medewerkers." },
      ],
      en: [
        { title: "A campaign game", body: "A short game with a leaderboard or prize draw that gets visitors playing and sharing." },
        { title: "A product configurator", body: "Customers build a product and immediately see the result and price." },
        { title: "Interactive learning", body: "Training and explanations as a playable experience, for customers or staff." },
      ],
    },
    deliverables: {
      nl: ["Concept en speelmechaniek", "Visueel ontwerp en animatie", "Browsergame (HTML5 / WebGL)", "Scoreborden en accounts", "Prestatieoptimalisatie voor mobiel"],
      en: ["Concept and game mechanics", "Visual design and animation", "Browser game (HTML5 / WebGL)", "Leaderboards and accounts", "Performance optimisation for mobile"],
    },
    considerations: {
      nl: ["De omvang van een game bepaalt de planning sterk; we beginnen met een speelbaar prototype om de kern te testen.", "Winacties vallen onder regels voor kansspelen en promoties; die check je vooraf."],
      en: ["Game scope strongly drives the timeline, so we start with a playable prototype to test the core.", "Prize promotions fall under gaming and promotion rules, which need checking up front."],
    },
    faqs: {
      nl: [{ q: "Werkt een browsergame op elke telefoon?", a: "Op moderne telefoons en browsers wel. We stellen vooraf vast welke apparaten we ondersteunen en testen daarop." }],
      en: [{ q: "Does a browser game work on every phone?", a: "On modern phones and browsers, yes. We agree up front which devices we support and test on them." }],
    },
  },
  {
    slug: "platforms",
    icon: "network",
    onHome: true,
    title: { nl: "Platforms & marktplaatsen", en: "Platforms & marketplaces" },
    short: {
      nl: "Platforms die vraag en aanbod samenbrengen, met profielen, zoeken en matching.",
      en: "Platforms that bring supply and demand together, with profiles, search and matching.",
    },
    intro: {
      nl: "Een marktplaats werkt pas als beide kanten er waarde uit halen. Ik bouw platforms met profielen, zoeken en filteren, berichten en, waar nodig, betalingen — en denk mee over hoe je de eerste gebruikers aan beide kanten binnenhaalt.",
      en: "A marketplace only works when both sides get value from it. I build platforms with profiles, search and filtering, messaging and, where needed, payments — and help think through how to win the first users on both sides.",
    },
    useCases: {
      nl: [
        { title: "Een nichemarktplaats voor een branche", body: "Vraag en aanbod in één sector samenbrengen, zoals vacatures, materieel of diensten." },
        { title: "Een vacature- of matchingplatform", body: "Kandidaten en opdrachtgevers vinden elkaar via profielen, filters en notificaties." },
        { title: "Een leveranciersnetwerk", body: "Bedrijven vragen offertes aan bij aangesloten leveranciers en vergelijken die op één plek." },
      ],
      en: [
        { title: "A niche marketplace for an industry", body: "Bringing supply and demand together within one sector, such as jobs, equipment or services." },
        { title: "A job or matching platform", body: "Candidates and clients find each other through profiles, filters and notifications." },
        { title: "A supplier network", body: "Businesses request quotes from connected suppliers and compare them in one place." },
      ],
    },
    deliverables: {
      nl: ["Platformconcept en verdienmodel", "Profielen, advertenties en zoekfuncties", "Berichten en notificaties", "Moderatie en beheer", "Betalingen en abonnementen", "SEO voor advertentiepagina's"],
      en: ["Platform concept and revenue model", "Profiles, listings and search", "Messaging and notifications", "Moderation and admin", "Payments and subscriptions", "SEO for listing pages"],
    },
    considerations: {
      nl: ["Platforms met betalingen tussen gebruikers vragen extra aandacht voor regelgeving en betaalproviders.", "Groei hangt naast techniek af van marketing en het werven van de eerste gebruikers."],
      en: ["Platforms with payments between users need extra attention to regulation and payment providers.", "Growth depends on marketing and recruiting early users as well as on the technology."],
    },
    faqs: {
      nl: [{ q: "Kan een platform klein beginnen?", a: "Ja, en dat is meestal verstandig. We starten met de kernfunctie voor één doelgroep en breiden uit zodra er gebruik is." }],
      en: [{ q: "Can a platform start small?", a: "Yes, and that's usually wise. We start with the core feature for one audience and expand once there's usage." }],
    },
  },
];

export function getService(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}

export const homeServices = services.filter((s) => s.onHome);
