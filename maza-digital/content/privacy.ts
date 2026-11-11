import type { Localized } from "@/lib/i18n";

/**
 * Privacy policy content. Review with a legal professional before launch,
 * and update when you add analytics, cookies or new processors.
 */
export const privacyUpdated = "2026-11-11";

export const privacySections: { title: Localized; body: Localized<string[]> }[] = [
  {
    title: { nl: "Wie zijn wij", en: "Who we are" },
    body: {
      nl: ["Deze website wordt beheerd door {brand}, eigenaar Ferry Mazereeuw, gevestigd in Nederland. Wij zijn verantwoordelijk voor de verwerking van persoonsgegevens zoals beschreven in deze verklaring. Contact: {email}."],
      en: ["This website is operated by {brand}, owned by Ferry Mazereeuw, based in the Netherlands. We are responsible for processing personal data as described in this policy. Contact: {email}."],
    },
  },
  {
    title: { nl: "Welke gegevens we verwerken", en: "What data we process" },
    body: {
      nl: [
        "Als je het aanvraagformulier invult, verwerken we je naam, e-mailadres, optioneel je bedrijfsnaam en telefoonnummer, en de informatie die je over je project geeft.",
        "Voor beveiliging en het tegengaan van misbruik verwerken we tijdelijk je IP-adres. Als spambeveiliging via Cloudflare Turnstile actief is, verwerkt Cloudflare daarvoor technische gegevens van je browser.",
      ],
      en: [
        "When you complete the enquiry form, we process your name, email address, optionally your company name and phone number, and the information you provide about your project.",
        "For security and abuse prevention we temporarily process your IP address. If spam protection via Cloudflare Turnstile is active, Cloudflare processes technical browser data for that purpose.",
      ],
    },
  },
  {
    title: { nl: "Waarom we dit doen", en: "Why we do this" },
    body: {
      nl: ["We gebruiken je gegevens uitsluitend om op je aanvraag te reageren, een voorstel te doen en, als we gaan samenwerken, het project uit te voeren. De grondslag is je toestemming en, bij een opdracht, de uitvoering van een overeenkomst. We sturen geen nieuwsbrieven zonder je aparte toestemming."],
      en: ["We use your data solely to respond to your enquiry, make a proposal and, if we work together, carry out the project. The legal basis is your consent and, for an engagement, the performance of a contract. We do not send newsletters without your separate consent."],
    },
  },
  {
    title: { nl: "Met wie we gegevens delen", en: "Who we share data with" },
    body: {
      nl: ["We verkopen je gegevens nooit. We gebruiken verwerkers die nodig zijn om deze website te laten werken: de hostingpartij van de website, een e-maildienst (Resend) om aanvragen te bezorgen en, indien actief, Cloudflare voor spambeveiliging. Met deze partijen zijn of worden verwerkersafspraken gemaakt. Sommige verwerkers kunnen gegevens buiten de EER verwerken; dat gebeurt dan op basis van passende waarborgen zoals modelcontractbepalingen."],
      en: ["We never sell your data. We use processors needed to run this website: the website hosting provider, an email service (Resend) to deliver enquiries and, if active, Cloudflare for spam protection. Data processing agreements are or will be in place with these parties. Some processors may process data outside the EEA; this then happens on the basis of appropriate safeguards such as standard contractual clauses."],
    },
  },
  {
    title: { nl: "Bewaartermijn", en: "Retention" },
    body: {
      nl: ["Aanvragen die niet tot een samenwerking leiden, verwijderen we uiterlijk 12 maanden na het laatste contact. Gegevens van klanten bewaren we zolang nodig voor de samenwerking en de wettelijke (fiscale) bewaarplicht."],
      en: ["Enquiries that don't lead to an engagement are deleted no later than 12 months after the last contact. Client data is kept as long as needed for the engagement and statutory (tax) retention obligations."],
    },
  },
  {
    title: { nl: "Cookies", en: "Cookies" },
    body: {
      nl: ["Deze website plaatst standaard geen tracking- of advertentiecookies. Als we in de toekomst analysetools toevoegen, passen we deze verklaring aan en vragen we waar nodig eerst je toestemming."],
      en: ["This website does not place tracking or advertising cookies by default. If we add analytics tools in the future, we will update this policy and ask for your consent first where required."],
    },
  },
  {
    title: { nl: "Je rechten", en: "Your rights" },
    body: {
      nl: ["Je hebt het recht om je gegevens in te zien, te laten corrigeren of verwijderen, de verwerking te beperken, bezwaar te maken en je gegevens over te dragen. Je kunt gegeven toestemming altijd intrekken. Stuur je verzoek naar {email}. Ben je niet tevreden over hoe we met je gegevens omgaan, dan kun je een klacht indienen bij de Autoriteit Persoonsgegevens."],
      en: ["You have the right to access, correct or delete your data, restrict processing, object and port your data. You can withdraw consent at any time. Send your request to {email}. If you're not satisfied with how we handle your data, you can file a complaint with the Dutch Data Protection Authority (Autoriteit Persoonsgegevens)."],
    },
  },
  {
    title: { nl: "Beveiliging", en: "Security" },
    body: {
      nl: ["We nemen passende technische en organisatorische maatregelen om je gegevens te beschermen, waaronder versleutelde verbindingen (HTTPS) en beperkte toegang."],
      en: ["We take appropriate technical and organisational measures to protect your data, including encrypted connections (HTTPS) and restricted access."],
    },
  },
];
