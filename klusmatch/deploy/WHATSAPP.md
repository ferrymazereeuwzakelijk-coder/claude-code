# Echte WhatsApp koppelen (Meta WhatsApp Business Cloud API)

Met het **gratis testnummer van Meta** kun je KlusMatch vanaf je eigen telefoon via WhatsApp testen.
Het testnummer kan berichten sturen naar maximaal 5 telefoonnummers die je zelf toevoegt en bevestigt.
Voor een eigen (Nederlands) bedrijfsnummer en livegang zie "Daarna" onderaan.

De simulator blijft gewoon werken: gesprekken die in de simulator zijn begonnen, blijven altijd lokaal.

## Wat je nodig hebt

* Een Facebook-account (om in te loggen bij Meta for Developers)
* Je telefoon met WhatsApp
* Toegang tot het Vercel-project `klusmatch-test`

## Stap 1 — App aanmaken bij Meta

1. Ga naar **developers.facebook.com** → rechtsboven **My Apps** → **Create App**.
2. Kies als use case **"Connect with customers through WhatsApp"** (of: *Other* → type *Business*).
3. Geef de app een naam, bijv. `KlusMatch Test`. Koppel een *Business portfolio* (maak er een aan als
   Meta daarom vraagt).
4. Open in het linkermenu **WhatsApp → API Setup** (soms: *Quickstart → API Setup*).

## Stap 2 — Testnummer en je eigen telefoon

Op de pagina **API Setup**:

1. Bij **From** staat een testnummer van Meta. Daaronder staat de **Phone number ID** (een getal van
   ± 15 cijfers). **Noteer dit getal** — het is niet geheim.
2. Bij **To** → **Manage phone number list** → voeg **je eigen mobiele nummer** toe
   (bijv. `+31 6 12345678`) en bevestig met de code die je via WhatsApp krijgt.
3. Klik op **Generate access token** en kopieer het token (begint meestal met `EAA…`).
   ⚠️ Dit token is geheim en **24 uur geldig**.

## Stap 3 — Twee geheimen in Vercel zetten

Ga naar **vercel.com** → project **klusmatch-test** → **Settings → Environment Variables** en voeg
toe of wijzig (omgeving: *Production* en *Preview*):

| Naam | Waarde |
|---|---|
| `WHATSAPP_ACCESS_TOKEN` | het access token uit stap 2 |
| `WHATSAPP_APP_SECRET` | Meta: **App settings → Basic → App secret** → *Show* → kopiëren (vervangt de bestaande waarde) |

## Stap 4 — Webhook instellen bij Meta

In Meta: **WhatsApp → Configuration** (of *API Setup → Configure webhooks*) → **Edit** bij *Webhook*:

| Veld | Waarde |
|---|---|
| Callback URL | `https://klusmatch-test.vercel.app/api/whatsapp/webhook` |
| Verify token | het controlewoord dat je van KlusMatch/Claude hebt gekregen (`WHATSAPP_VERIFY_TOKEN` in Vercel) |

Klik **Verify and save**. Klik daarna bij *Webhook fields* op **Manage** en zet **messages** aan
(*Subscribe*).

## Stap 5 — Aanzetten

Laat het **Phone number ID** weten; daarna worden `WHATSAPP_MODE=cloud_api` en
`WHATSAPP_PHONE_NUMBER_ID` gezet en wordt de site opnieuw uitgerold (instellingen in Vercel gelden pas
na een nieuwe uitrol).

## Stap 6 — Testen

Stuur vanaf je telefoon een WhatsApp-bericht naar het **testnummer van Meta** (stap 2, *From*), bijv.
*"Hallo, mijn schutting moet geschilderd worden"* met een foto. Je krijgt de toestemmingsvraag; antwoord
**JA** en volg de vragen. Als schilder (`schilder@demo.klusmatch.test`) kun je daarna een offerte sturen,
die je in WhatsApp ontvangt — accepteren met **ACCEPTEER &lt;code&gt;** en **JA**.

## Goed om te weten

* **24-uursvenster:** WhatsApp staat vrije berichten alleen toe tot 24 uur na jouw laatste bericht.
  Daarna zijn goedgekeurde *message templates* nodig (zie `src/lib/whatsapp/templates.ts`), die je bij
  Meta aanmaakt onder **WhatsApp Manager → Message templates**. Voor een test binnen 24 uur is dat niet nodig.
* **Token verloopt na 24 uur.** Voor langer testen: maak in *Business Settings → System users* een
  system user met de rol Admin, geef hem de app + WhatsApp-account, en genereer een **permanent token**
  met de rechten `whatsapp_business_messaging` en `whatsapp_business_management`.
* **Daarna (livegang):** eigen telefoonnummer toevoegen in WhatsApp Manager, bedrijfsverificatie bij Meta,
  templates laten goedkeuren, `APP_ENV=production` (zet de simulator uit) en een vaste worker.
