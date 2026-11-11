# MAZA DIGITAL website

Next.js 15 · TypeScript · Tailwind CSS v4 · shadcn/ui · Framer Motion · Lucide

Bilingual (Dutch default, English), SEO-ready studio website with a multi-step project enquiry form that sends real email through Resend.

---

## 1. Run it locally

Requirements: Node.js 20 or newer.

```bash
npm install
cp .env.example .env.local     # then fill in the values
npm run dev                    # http://localhost:3000 -> redirects to /nl
```

Before deploying, check that everything compiles:

```bash
npm run typecheck
npm run lint
npm run build
```

> `npm run typecheck`, `npm run lint` and `npm run build` pass cleanly.

---

## 2. Where to edit content

All copy and data live in `content/`. Components never contain hard-coded text.

| What | File |
|---|---|
| Brand name, email, WhatsApp, socials, KvK/btw | `content/site.ts` (+ `.env.local`) |
| Interface text NL / EN | `content/dictionaries/nl.ts`, `content/dictionaries/en.ts` |
| Services (7 pages) | `content/services.ts` |
| Projects and case studies | `content/projects.ts` |
| Privacy policy | `content/privacy.ts` |
| Homepage pain points, FAQ, trust line, mobile sticky CTA | `problems`, `faq`, `hero.trust`, `stickyCta` in the dictionaries |
| Founder photo | `components/sections/portrait.tsx` (`PORTRAIT_SRC`) |
| Demo products | `app/demo/<slug>/app.tsx` |

### Switch brand name

Set `NEXT_PUBLIC_BRAND_NAME="MAZAMARKETING"` in your environment. Everything follows: logo, titles, Open Graph, footer, emails.

### Adding or confirming a project

Projects have a `kind`:

- `"concept"`: a working demo product with a fictional brand (`demoUrl`). Always public, always labelled **Demo** on the card and the case page. Six ship with the site. Never add a real client name, metrics or quotes to a concept.
- `"client"`: real work. These ship with `verified: false`. Unverified client projects are:

- **shown** in development (`npm run dev`) with a "Placeholder, not yet verified" badge
- **hidden** in production (unless `NEXT_PUBLIC_SHOW_UNVERIFIED_PROJECTS=true`, useful for a private preview deployment)
- always `noindex` and left out of the sitemap

To publish a project:

1. Put a real screenshot in `public/projects/` (WebP or AVIF, ~2400px wide, 16:10).
2. Set `screenshot: "/projects/name.webp"`.
3. Replace the draft `summary` and `caseStudy` texts with what's true. **No invented metrics, quotes or client logos.**
4. Optionally add `liveUrl` and `year`.
5. Set `verified: true`.

If no project is verified, the homepage and portfolio show a short "portfolio is being expanded" message instead of an empty grid.

### WhatsApp

Hidden until you set `NEXT_PUBLIC_WHATSAPP_NUMBER` (international format, digits only, e.g. `31612345678`). It then appears in the closing CTA, footer and contact page.

---

## 3. Enquiry form & email

Flow: 4 steps (project type → description & features → budget & timeline → contact details), validated in the browser per step and again on the server with the same `zod` schema (`lib/enquiry-schema.ts`).

Server route: `app/api/enquiry/route.ts`

- Same-origin check, 20 KB body limit
- Rate limit: 5 enquiries per IP per hour (`lib/rate-limit.ts`)
- Honeypot field + minimum fill time (bots get a silent fake "ok", no email is sent)
- Optional Cloudflare Turnstile (`NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`)
- **If email isn't configured the API returns 503 and the visitor sees a clear message with your email address. It never pretends to succeed.**

### Set up Resend (about 10 minutes)

1. Create an account at resend.com.
2. Domains → add your domain (e.g. `mazadigital.nl`) and add the DNS records it shows (SPF, DKIM) at your domain registrar. Wait until it's "Verified".
3. API Keys → create a key with "Sending access".
4. Set:
   ```
   RESEND_API_KEY=re_...
   ENQUIRY_FROM_EMAIL="Maza Digital <website@mazadigital.nl>"
   ENQUIRY_TO_EMAIL=you@yourdomain.nl
   ```
5. Submit a test enquiry. Replies go straight to the visitor (reply-to is set).

### File attachments

Disabled on purpose: there's no secure storage configured. The form tells visitors to share a link instead. To add uploads later, use private object storage (e.g. Vercel Blob with private access, or S3 with signed URLs), validate file type/size server-side, scan files, and update the privacy policy.

### Rate limiting on serverless

The built-in limiter is in-memory, per instance. On Vercel it's a reasonable first line of defence alongside the honeypot and Turnstile. For stricter limits, swap `lib/rate-limit.ts` for Upstash Redis (`@upstash/ratelimit`).

---

## 4. Deploy (Vercel, recommended)

**Don't point your live domain at this deployment until you've approved it.** A Vercel preview URL is fine for review.

1. Push this folder to a new GitHub repository (private is fine).
2. vercel.com → Add New → Project → import the repository. Framework preset: Next.js (auto-detected).
3. Settings → Environment Variables: add everything from `.env.example`. Set `NEXT_PUBLIC_SITE_URL` to the final URL.
4. Deploy. You get a `*.vercel.app` preview URL to review.
5. When you're happy, and only then: Settings → Domains → add `mazadigital.nl` and `www.mazadigital.nl`, and follow the DNS instructions. If an existing site runs on that domain, it'll be replaced once DNS changes, so plan this moment.

### Alternative: any Node host

```bash
npm ci && npm run build
PORT=3000 npm start
```

Run behind a reverse proxy with HTTPS (e.g. Caddy or Nginx). Set the same environment variables.

### After going live

- Submit `https://your-domain/sitemap.xml` in Google Search Console.
- Check the Open Graph preview with a share debugger (LinkedIn Post Inspector, for example).
- Run Lighthouse on `/nl` and `/nl/contact`.

---

## 5. Structure

```
app/
  [locale]/                 every page lives under /nl or /en
    page.tsx                homepage
    services/ [slug]/       overview + 7 service pages
    projects/ [slug]/       filterable portfolio + case studies
    about/ contact/ privacy/
    opengraph-image.tsx     generated OG image per language
  api/enquiry/route.ts      form submission
  sitemap.ts robots.ts icon.svg
components/
  ui/                       shadcn/ui-style primitives
  layout/                   header, footer, logo, language switcher
  hero/                     hero + animated canvas
  sections/                 homepage sections
  projects/                 cards, filter, visuals
  contact/                  multi-step enquiry form
content/                    all editable content (see above)
lib/                        i18n, SEO, validation, email, rate limiting
middleware.ts               redirects / to /nl
```

### Adding a shadcn/ui component

`components.json` is set up, so `npx shadcn@latest add dialog` (for example) works and uses the existing theme tokens in `app/globals.css`.

### Hero showcase

`components/hero/hero-showcase.tsx` places real screenshots of the demos in 3D space; it leans towards the pointer and drifts as you scroll. Still for touch and reduced-motion visitors.

### Demo products

`app/demo/<slug>/` holds six working demo products (Kadeboek, Veldwerk, Stroomlijn, Korrel, Vlootzicht, Diepte), each with its own root layout and look (`app/demo/demo.css`). They use fictional brands, carry a "Demo" badge, are `noindex`, and are embedded on their case pages (`X-Frame-Options: SAMEORIGIN`). Screenshots in `public/projects/` are taken from these demos: retake them when a demo changes.

---

## 6. Before launch checklist

- [ ] `content/site.ts`: confirm public email, add socials, KvK and btw-number
- [ ] Confirm or remove each project in `content/projects.ts`
- [ ] Add founder photo (`PORTRAIT_SRC`)
- [ ] Have the privacy policy reviewed; update it if you add analytics
- [ ] Resend domain verified and test enquiry received
- [ ] Turnstile keys set (recommended)
- [ ] WhatsApp number confirmed (optional)
- [ ] Read the homepage FAQ and pain points (`faq`, `problems` in the dictionaries) and adjust anything that doesn't match how you work
- [ ] `npm run build` passes, Lighthouse checked
