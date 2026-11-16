/**
 * Browser end-to-end smoke test of the vertical slice against a running server with demo data:
 *   customer registers → AI intake (with photo) → confirms → job published →
 *   demo contractor quotes → customer accepts → contractor sees private details →
 *   admin dashboards render → WhatsApp simulator round-trip.
 *
 * Usage: npm run build && npm start (in another shell), npm run db:seed:demo, then `npm run test:e2e`.
 */
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
// Playwright is provided by the environment (not a project dependency), so it is loosely typed here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const playwright: any = require('playwright');
const { chromium } = playwright;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Page = any;

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const SHOTS = process.env.E2E_SCREENSHOTS ?? 'test-results/e2e';
const DEMO_PW = 'demo-wachtwoord-2026';
const RUN = Date.now().toString(36); // makes texts unique, the demo database accumulates runs
mkdirSync(SHOTS, { recursive: true });

const step = (s: string) => console.log(`\n▶ ${s}`);
const shot = (p: Page, name: string) => p.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });

const browser = await chromium.launch();
// Optional HTTP Basic auth for protected test deployments (DEMO_BASIC_AUTH on the server).
if (process.env.E2E_HTTP_USER) {
  const creds = { username: process.env.E2E_HTTP_USER, password: process.env.E2E_HTTP_PASSWORD ?? '' };
  const newContext = browser.newContext.bind(browser);
  browser.newContext = (opts: Record<string, unknown> = {}) => newContext({ ...opts, httpCredentials: creds });
}
const openPages: Page[] = [];
try {
  // A real PNG to upload: render a small "fence" and screenshot it.
  const imgPage = await browser.newPage({ viewport: { width: 320, height: 200 } });
  await imgPage.setContent('<div style="width:320px;height:200px;background:repeating-linear-gradient(90deg,#8B6B4A 0 26px,#5d4630 26px 30px)"></div>');
  const photo = path.join(SHOTS, 'fence.png');
  await imgPage.screenshot({ path: photo });
  await imgPage.close();

  // ── Customer: register + intake ──
  step('Customer registers');
  const customer = await (await browser.newContext({ viewport: { width: 1360, height: 900 } })).newPage();
  await customer.goto(BASE);
  await shot(customer, '01-landing');
  await customer.goto(`${BASE}/registreren`);
  await customer.fill('#fullName', 'Eva Jansen');
  await customer.fill('#email', `eva.${Date.now()}@example.test`);
  await customer.fill('#password', 'een-sterk-wachtwoord');
  await customer.click('button[type=submit]');
  await customer.waitForURL('**/klant/nieuw');

  step('AI intake via web chat (with photo)');
  const say = async (text: string, expect: RegExp | string) => {
    const before = await customer.locator('.whitespace-pre-line').count();
    await customer.fill('textarea[aria-label=Bericht]', text);
    await customer.click('button[aria-label=Verstuur]');
    await customer.waitForFunction((n: number) => document.querySelectorAll('.whitespace-pre-line').length >= n + 2, before, { timeout: 30_000 });
    await customer.getByText(expect).last().waitFor({ timeout: 30_000 });
  };
  await customer.setInputFiles('input[type=file]', photo);
  await say('De houten schutting in de achtertuin moet geschilderd worden, de verf bladdert af.', /postcode/i);
  await say('3512 AB', /groot|omvang/i);
  await say('ongeveer 15 meter lang, 1,8 meter hoog', /wanneer/i);
  await say('binnen een maand', /budget/i);
  await say('maximaal € 900', 'Concept klusomschrijving');
  await shot(customer, '02-intake-draft');

  step('Customer confirms → job published');
  await customer.click('text=Klopt, plaats mijn klus');
  await customer.getByText('Je klus staat online').waitFor();
  await customer.click('text=Bekijk je klus');
  await customer.waitForURL('**/klant/klussen/**');
  const jobId = customer.url().split('/').pop()!;
  await customer.getByText('Wachten op offertes').waitFor();
  console.log('  job', jobId);

  // ── Contractor quotes ──
  step('Verified contractor sees job and submits a quote');
  const contractor = await (await browser.newContext({ viewport: { width: 1360, height: 900 } })).newPage();
  await contractor.goto(`${BASE}/inloggen`);
  await contractor.fill('#email', 'schilder@demo.klusmatch.test');
  await contractor.fill('#password', DEMO_PW);
  await contractor.click('button[type=submit]');
  await contractor.waitForURL('**/vakman');
  await contractor.locator(`a[href="/vakman/klussen/${jobId}"]`).waitFor();
  await shot(contractor, '03-contractor-feed');
  await contractor.goto(`${BASE}/vakman/klussen/${jobId}`);
  await contractor.fill('#amountEur', '850');
  await contractor.fill('#message', 'Schuren, één laag grondverf en twee lagen dekkende beits. Inclusief materiaal en afdekken van de border.');
  await contractor.click('text=Verstuur offerte');
  await contractor.getByText(/Jouw offerte/).waitFor();

  // ── Customer accepts ──
  step('Customer compares and accepts the quote');
  await customer.reload();
  await customer.getByText('Visser Schilderwerken').waitFor();
  await shot(customer, '04-quote-comparison');
  await customer.click('text=Accepteer offerte');
  await customer.click('text=Ja, accepteer');
  await customer.getByText('Je hebt gekozen voor Visser Schilderwerken').waitFor();

  step('Contractor now sees private details');
  await contractor.reload();
  await contractor.getByText('Je hebt deze klus gekregen').waitFor();
  await contractor.getByText('3512 AB').waitFor();
  await shot(contractor, '05-contractor-awarded');

  // ── Lifecycle: completion, review, reply ──
  step('Customer marks job completed and writes a review');
  await customer.click('text=Markeer als afgerond');
  await customer.click('text=Ja, klus is afgerond');
  await customer.getByText(/Hoe was het werken met/).waitFor();
  await customer.click('button[aria-label="4 sterren"]');
  await customer.fill('textarea[aria-label=Review]', `Netjes gewerkt, op tijd en alles opgeruimd achtergelaten (${RUN}).`);
  await customer.click('text=Plaats review');
  await customer.getByText('Jouw review').waitFor();
  await customer.getByText('Review geplaatst').waitFor(); // timeline entry
  await shot(customer, '10-customer-completed-review');

  step('Contractor replies to the review');
  await contractor.reload();
  await contractor.getByText('Review van de klant').waitFor();
  await contractor.fill('input[aria-label=Reactie]', `Dank je wel, graag tot een volgende keer! (${RUN})`);
  await contractor.click('button:has-text("Reageer")');
  await contractor.getByText('Jouw reactie:').waitFor();

  step('Contractor adds a portfolio photo; public profile shows it with the review');
  await contractor.goto(`${BASE}/vakman/profiel`);
  await contractor.setInputFiles('#photo', photo);
  await contractor.fill('input[aria-label=Bijschrift]', `Schutting in Utrecht ${RUN}`);
  await contractor.click('button:has-text("Toevoegen")');
  await contractor.getByText('Foto toegevoegd aan je portfolio').waitFor();
  const profileHref = await contractor.locator('a:has-text("Bekijk openbaar profiel")').getAttribute('href');
  const visitor = await (await browser.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); // not logged in
  await visitor.goto(`${BASE}${profileHref}`);
  await visitor.getByText(`opgeruimd achtergelaten (${RUN})`).waitFor();
  await visitor.getByText(`graag tot een volgende keer! (${RUN})`).waitFor();
  await visitor.locator(`img[alt="Schutting in Utrecht ${RUN}"]`).waitFor();
  const portfolioImg = visitor.locator(`img[alt="Schutting in Utrecht ${RUN}"]`);
  await portfolioImg.scrollIntoViewIfNeeded(); // images are lazy-loaded
  const imgOk = await portfolioImg.evaluate(
    (i: HTMLImageElement) =>
      new Promise<boolean>((resolve) => {
        if (i.complete) return resolve(i.naturalWidth > 0);
        i.addEventListener('load', () => resolve(i.naturalWidth > 0), { once: true });
        i.addEventListener('error', () => resolve(false), { once: true });
      }),
  );
  if (!imgOk) throw new Error('portfolio image did not load for an anonymous visitor');
  await shot(visitor, '11-public-profile');
  // Clean up (the demo database is reused between runs) and exercise removal.
  await contractor.goto(`${BASE}/vakman/profiel`);
  await contractor.locator('figure', { has: contractor.locator(`img[alt="Schutting in Utrecht ${RUN}"]`) }).locator('button[aria-label="Verwijder foto"]').click({ force: true });
  await contractor.locator(`img[alt="Schutting in Utrecht ${RUN}"]`).waitFor({ state: 'detached' });

  step('Customer reports a dispute');
  await customer.click('text=Geschil melden');
  await customer.fill('textarea[name=body]', 'Er is een plank vergeten te schilderen aan de achterkant.');
  await customer.click('button[type=submit]:has-text("Geschil melden")');
  await customer.getByText(/Geschil gemeld/).waitFor();

  // ── Admin ──
  step('Admin dashboards');
  const admin = await (await browser.newContext({ viewport: { width: 1360, height: 900 } })).newPage();
  await admin.goto(`${BASE}/inloggen`);
  await admin.fill('#email', 'admin@demo.klusmatch.test');
  await admin.fill('#password', DEMO_PW);
  await admin.click('button[type=submit]');
  await admin.waitForURL('**/admin');
  await shot(admin, '06-admin');
  await admin.goto(`${BASE}/admin/systeem`);
  await admin.getByText('Auditlog').waitFor();
  await admin.getByText('quote.accepted').first().waitFor();
  await shot(admin, '07-admin-system');
  await admin.goto(`${BASE}/admin/meldingen`);
  await admin.getByText('Er is een plank vergeten').waitFor();
  await shot(admin, '12-admin-disputes');
  await admin.fill('input[aria-label=Notitie]', 'Vakman komt donderdag de plank afmaken.');
  await admin.click('button:has-text("Opgelost")');
  await admin.getByText('Geen open meldingen').waitFor();
  await admin.goto(`${BASE}/admin/gebruikers?q=Eva`);
  await admin.getByText('Eva Jansen').first().waitFor();
  await shot(admin, '13-admin-users');

  // ── Authorization spot checks ──
  step('Authorization: contractor cannot open the customer page');
  const res = await contractor.goto(`${BASE}/klant/klussen/${jobId}`);
  if (!contractor.url().endsWith('/vakman')) throw new Error(`expected redirect, got ${contractor.url()} (${res?.status()})`);

  // ── WhatsApp simulator ──
  step('WhatsApp simulator round-trip');
  const sim = await (await browser.newContext({ viewport: { width: 1360, height: 900 } })).newPage();
  await sim.goto(`${BASE}/dev/whatsapp`);
  await sim.fill('#phone', `+316${Math.floor(10000000 + Math.random() * 89999999)}`);
  const phoneList = sim.locator('[aria-live=polite]');
  const waSay = async (text: string, expect: RegExp) => {
    const before = await phoneList.locator('> div').count();
    await sim.fill('input[aria-label=Bericht]', text);
    await sim.click('button[aria-label=Verstuur]');
    // Wait for our message plus the bot's reply, then check the latest bot bubble.
    await sim.waitForFunction((n: number) => (document.querySelector('[aria-live=polite]')?.children.length ?? 0) >= n + 2, before, { timeout: 30_000 });
    const lastBot = phoneList.locator('> div.justify-start').last();
    await lastBot.filter({ hasText: expect }).waitFor({ timeout: 30_000 });
  };
  await waSay('Onze dakgoot lekt bij de voordeur, kan iemand dat repareren?', /akkoord/i);
  await waSay('JA', /postcode/i);
  await waSay('3811 AB', /groot|omvang/i);
  await waSay('ongeveer 8 meter goot', /wanneer/i);
  await waSay('zo snel mogelijk', /budget/i);
  await waSay('geen idee', /Klopt alles/);
  await waSay('ja', /Je klus is geplaatst/);
  await shot(sim, '08-whatsapp-simulator');

  // Mobile rendering
  step('Mobile layouts');
  const mobile = await (await browser.newContext({ ...playwright.devices['iPhone 13'] })).newPage();
  await mobile.goto(BASE);
  await shot(mobile, '09-mobile-landing');

  console.log(`\n✅ E2E smoke passed. Screenshots in ${SHOTS}`);
} catch (err) {
  console.error('\n❌ E2E smoke failed:', err);
  for (const [i, p] of browser.contexts().flatMap((c: Page) => c.pages()).entries()) await p.screenshot({ path: path.join(SHOTS, `failure-${i}.png`), fullPage: true }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}
