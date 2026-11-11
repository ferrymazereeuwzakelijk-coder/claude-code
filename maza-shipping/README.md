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

## Design

Dark "bridge" look: ink black, the logo blue (`#00A2E0`) and the orange-red of the Ferry-Jo's wheelhouse trim, wide heavy Archivo display type and JetBrains Mono instrument labels (`app/globals.css`).

- **3D Ferry-Jo** (`components/three/`): a procedural three.js model measured from side-on photos of the vessel (wheelhouse just forward of midships, low stern, high bow), on shader water. On the home page the camera walks around the ship while scrolling and spec callouts point at its parts (`components/ShipHero.tsx`); the tugboat page has a drag-to-rotate viewer (`components/ShipViewer.tsx`). three.js only loads in the browser, after the page; without WebGL a photo is shown. Reduced-motion users get a still scene.
- **Footage**: `public/video/ferryjo-ponton.mp4` (owner video, re-encoded to 1280 px, no audio) grows to full screen on scroll (`components/ScrollVideo.tsx`); two upright clips (`dock-tow.mp4`, `assist-tow.mp4`) play in the "In action" strip (`components/ClipStrip.tsx`).
- **Owner photos** are self-hosted in `public/images` and used for every page header, so the site no longer depends on the old Base44 hosting for its main visuals. The ice photo (`ferryjo-ice.jpg`) carries a photographer's watermark: confirm it may be used.
- **Logo**: `components/Logo.tsx`, the official wordmark from `maza_TEKST.pdf` as inline SVG ("MAZA" follows the text colour, "SHIPPING" is always brand blue).

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
3. Brokerage division wording (new content; no client names, partners or figures were invented)
4. Privacy notice wording and retention period
