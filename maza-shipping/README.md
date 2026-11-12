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

- **Homepage scroll story** (`components/StoryHero.tsx`, `components/three/story/`): one pinned WebGL scene in daylight on an inland waterway. Scroll position drives everything through a pure, deterministic timeline (`timeline.ts`): intro → pushing an empty pontoon to the quay → backing off → passing and rigging a towline to a pontoon with ship sections → towing → a wide shot of third-party partner vessels (labelled as partners) → call to action. Scrolling back reverses every step exactly. The Ferry-Jo is the owner's model (`components/three/ferryjo-model.ts`); pontoons, cargo and partner vessels are representative models (`vessels.ts`), the environment is in `world.ts`. Chapter buttons, a skip link, a screen-reader text version and a photo fallback (no WebGL) are included; reduced-motion users get the same scroll story without easing or ambient motion.
- **Story checks**: `npm run check:story` samples the timeline 4,000 times and fails on jumps, collisions (tug, pontoons, quay, banks, partner fleet), a towline through a hull or a camera below water/ground level.
- **3D viewer** on the tugboat page (`components/ShipViewer.tsx`, `components/three/scene.ts`): drag-to-rotate Ferry-Jo.
- **Footage**: `public/video/ferryjo-ponton.mp4` (owner video, re-encoded to 1280 px, no audio) grows to full screen on scroll (`components/ScrollVideo.tsx`); two upright clips (`dock-tow.mp4`, `assist-tow.mp4`) play in the "In action" strip (`components/ClipStrip.tsx`).
- **Owner photos** are self-hosted in `public/images` and used for every page header, so the site no longer depends on the old Base44 hosting for its main visuals. The ice photo (`ferryjo-ice.jpg`) carries a photographer's watermark: confirm it may be used. Only the gallery still shows older photos from the old site; any that fail to load drop out of the grid automatically. Run `npm run images:download` to keep them.
- **Icons and sharing**: `app/icon.svg` / `app/apple-icon.png` (the M from the wordmark) and `public/og.jpg`, the 1200×630 image shown when a link is shared.
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

## Dependencies

`package.json` pins a patched `postcss` for Next.js through `overrides`; `npm audit` reports no known vulnerabilities.

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
