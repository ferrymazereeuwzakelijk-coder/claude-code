# Maza Shipping — website

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Lucide icons (via `react-icons/lu`) · Zod.
Dutch (primary, `/nl`), English (`/en`) and German (`/de`).

## Quick start

```bash
npm install
cp .env.example .env.local      # fill in RESEND_API_KEY for the forms
npm run images:download         # optional: copy the original photos into /public/images
npm run dev                     # http://localhost:3000 → redirects to /nl
```

Deploy: push to GitHub and import into **Vercel** (zero config). Set the env vars from `.env.example` in the Vercel project, then point `mazashipping.com` to it.

## Pages

| Route | Content |
|---|---|
| `/nl`, `/en`, `/de` | Home: hero, two divisions, about, featured vessel, solutions grid, why us, CTA |
| `/[locale]/tugboat-services` | Ferry-Jo: specs table, capabilities, gallery + lightbox, charter request form, FAQ |
| `/[locale]/maritime-brokerage` | Brokerage division: 5 services, 3-step process, project enquiry form |
| `/[locale]/about` | Company, Marc Mazereeuw, approach |
| `/[locale]/contact` | Contact details, WhatsApp, quote form, click-to-load Google Map |
| `/[locale]/privacy` | Privacy notice (GDPR) |

Old URLs (`/diensten`, `/ferry-jo`, `/vragen`, `/about`, `/contact`, `/services-1`) are 301-redirected in `next.config.ts`.

## Editing content

- **Company facts, vessel specs, photos:** `content/site.ts`
- **All text (NL / EN / DE), SEO titles and descriptions, alt texts:** `content/dictionaries/nl.ts`, `en.ts` and `de.ts` (the Dutch and German files are type-checked against the English one, so nothing can be missing)
- **Languages:** `content/i18n.ts` (`locales`, `defaultLocale`)
- **Form service options:** `lib/enquiry-schema.ts`

## Photos

The photos are the originals from the previous website. By default they load from their existing Base44 hosting.
To self-host (recommended before the old site is closed):

```bash
npm run images:download          # saves to public/images
echo "NEXT_PUBLIC_IMAGE_BASE=/images" >> .env.local
```

All images go through `next/image` (AVIF/WebP, responsive sizes, lazy loading, no layout shift).

## Forms

All three forms post to `app/api/enquiry/route.ts`:
- Validation with Zod on the client (instant, accessible error messages) **and** on the server.
- Spam protection: hidden honeypot field, minimum fill time, per-IP rate limit.
- Delivery by e-mail through [Resend](https://resend.com) (`RESEND_API_KEY`, `ENQUIRY_TO`, `ENQUIRY_FROM`). Verify the `mazashipping.com` domain in Resend so mail is sent from it. Replies go straight to the sender (`reply_to`).
- Without an API key: development logs the enquiry to the console; production returns a clear error to the visitor (who is pointed to e-mail/phone).

## SEO

Unique titles and descriptions per page and language, canonical URLs, `hreflang` alternates, Open Graph/Twitter cards, JSON-LD (`LocalBusiness`, `Service`, `FAQPage`, `OfferCatalog`), `sitemap.xml`, `robots.txt`, descriptive alt texts, one `h1` per page.

## Accessibility & performance

Skip link, keyboard-operable menus, dropdown and lightbox (Esc / arrow keys), visible focus states, labelled form fields with `aria-invalid` + described errors, `prefers-reduced-motion` respected. Animations are CSS-only (one IntersectionObserver for scroll reveals) instead of a Framer Motion bundle, keeping JS small.

## Needs owner confirmation

See `content/site.ts` (`// CONFIRM`) and the list delivered with this build:
1. WhatsApp on +31 6 52 63 83 68 (set `whatsapp: null` to hide)
2. KvK number 53368878 (from the public register; set `kvk: null` to hide), legal entity name, BTW number
3. Official logo file (a typographic wordmark is used in `components/Logo.tsx` until supplied)
4. Brokerage division wording (new content; no client names, partners or figures were invented)
5. Privacy notice wording and retention period
