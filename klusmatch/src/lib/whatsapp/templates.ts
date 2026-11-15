/**
 * Message templates. Outside the 24-hour customer service window, WhatsApp only allows
 * pre-approved templates. These must be created and approved in Meta Business Manager
 * with exactly these names, language (nl) and parameter order before going live.
 */
export const TEMPLATES = {
  klusmatch_new_quote: {
    language: 'nl',
    category: 'UTILITY',
    body: 'Je hebt een nieuwe offerte ontvangen voor je klus {{1}}: {{2}} van {{3}}. Antwoord OFFERTES om alle offertes te bekijken.',
  },
  klusmatch_quote_accepted_contractor: {
    language: 'nl',
    category: 'UTILITY',
    body: 'Goed nieuws: je offerte voor klus {{1}} is geaccepteerd. Bekijk de contactgegevens in je KlusMatch-dashboard.',
  },
} as const;

export type TemplateName = keyof typeof TEMPLATES;

export function renderTemplate(name: TemplateName, params: string[]) {
  return TEMPLATES[name].body.replace(/\{\{(\d+)\}\}/g, (_, i) => params[Number(i) - 1] ?? '');
}
