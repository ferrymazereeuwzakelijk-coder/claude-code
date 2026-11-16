# Online testversie opzetten (Supabase + Vercel)

Zo zet je in ongeveer 20 minuten een **beveiligde testversie** van KlusMatch online, zonder iets te
installeren. Beide diensten hebben een gratis plan dat hiervoor genoeg is.

De testversie gebruikt demo-accounts, de WhatsApp-**simulator** (geen echte WhatsApp-berichten) en
de AI-intake op vaste regels (geen API-sleutel nodig). De hele site zit achter een gebruikersnaam
en wachtwoord die je zelf kiest.

---

## Stap 1 — Database (Supabase)

1. Ga naar **supabase.com** → *New project*.
   * Naam: `klusmatch-test`
   * Database password: laat Supabase er een genereren en **bewaar het** (heb je zo nodig)
   * Region: **Central EU (Frankfurt)**
2. Wacht tot het project klaar is (± 2 minuten).
3. Open links **SQL Editor** → *New query*.
   * Plak de volledige inhoud van [`01-schema.sql`](01-schema.sql) en klik **Run**. Verwacht: *Success*.
   * Nieuwe query: plak [`02-demo-data.sql`](02-demo-data.sql) en klik **Run**.
4. Verzamel deze drie waarden (je plakt ze in stap 2):

| Waarde | Waar te vinden |
|---|---|
| `DATABASE_URL` | Knop **Connect** (bovenaan) → *Transaction pooler* → de URI met poort **6543**. Vervang `[YOUR-PASSWORD]` door je databasewachtwoord. |
| `SUPABASE_URL` | *Project Settings* → **Data API** → *Project URL* (`https://xxxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | *Project Settings* → **API Keys** → de **service_role** / *secret* key. ⚠️ Deze sleutel is geheim: alleen in Vercel plakken, nergens anders. |

## Stap 2 — Website (Vercel)

1. Ga naar **vercel.com** → *Add New…* → **Project** → importeer de GitHub-repository
   `claude-code` (geef Vercel toegang als daarom wordt gevraagd).
2. Bij *Configure Project*:
   * **Root Directory:** klik *Edit* en kies **`klusmatch`**
   * Framework: *Next.js* (wordt automatisch herkend)
   * Open **Environment Variables** en voeg toe:

| Naam | Waarde |
|---|---|
| `APP_ENV` | `demo` |
| `DATABASE_URL` | uit stap 1 |
| `STORAGE_DRIVER` | `supabase` |
| `SUPABASE_URL` | uit stap 1 |
| `SUPABASE_SERVICE_ROLE_KEY` | uit stap 1 |
| `SUPABASE_STORAGE_BUCKET` | `klusmatch-media` |
| `WHATSAPP_MODE` | `simulator` |
| `WHATSAPP_APP_SECRET` | een lange willekeurige tekst (minstens 32 tekens) die je zelf verzint |
| `WHATSAPP_VERIFY_TOKEN` | nog een andere lange willekeurige tekst |
| `INLINE_WORKER` | `true` |
| `AI_PROVIDER` | `rules` *(of laat weg en zet `ANTHROPIC_API_KEY` voor de echte Claude-intake)* |
| `DEMO_BASIC_AUTH` | `gebruikersnaam:wachtwoord`, bijvoorbeeld `test:EenSterkWachtwoord2026` — dit is het slot op de hele site |

3. **Belangrijk:** de code staat (nog) niet op `main` maar op de branch van de pull request.
   Kies één van beide:
   * **Pull request #2 mergen** in GitHub, en dan in Vercel op **Deploy** klikken; *of*
   * eerst *Deploy* (dit mislukt omdat `main` nog geen `klusmatch` heeft), dan in Vercel:
     *Settings* → *Git* → **Production Branch** = `claude/klusmatch-ai-marketplace-00hbcx` →
     *Deployments* → *Redeploy*.
4. Na de deploy: zet `APP_BASE_URL` op je Vercel-adres (bijv. `https://klusmatch-test.vercel.app`)
   onder *Settings* → *Environment Variables*, en klik nog één keer **Redeploy**.

De servers draaien automatisch in Frankfurt (`vercel.json`), dicht bij de database.

## Stap 3 — Testen

Open je Vercel-adres. De browser vraagt eerst om de gebruikersnaam en het wachtwoord van
`DEMO_BASIC_AUTH`. Daarna kun je inloggen met de demo-accounts (wachtwoord **`demo-wachtwoord-2026`**):

| Account | Rol |
|---|---|
| `klant@demo.klusmatch.test` | klant met 2 geplaatste klussen |
| `schilder@demo.klusmatch.test` | geverifieerde schilder (Utrecht) |
| `hovenier@demo.klusmatch.test` | geverifieerde hovenier (Utrecht) |
| `admin@demo.klusmatch.test` | beheerder |
| `nieuw@demo.klusmatch.test` | vakman die nog geverifieerd moet worden |

Of maak zelf een nieuw klantaccount aan via *Klus plaatsen*.

**Suggestie voor een rondje:**
1. Als klant: *Nieuwe klus* → beschrijf een schilderklus in Utrecht (postcode 35xx), met foto.
2. Als `schilder@…`: de klus staat in de feed → offerte uitbrengen.
3. Als klant: offerte accepteren → *Markeer als afgerond* → review schrijven.
4. Als `admin@…`: verificatie, moderatie, meldingen en het systeemoverzicht bekijken.
5. **WhatsApp-simulator:** `<jouw-adres>/dev/whatsapp` — stuur een bericht en volg de flow.

## Goed om te weten

* Dit is een **testomgeving**: demo-wachtwoorden zijn openbaar bekend, daarom zit de hele site
  achter `DEMO_BASIC_AUTH`. Gebruik geen echte klantgegevens.
* Wil je opnieuw beginnen? Draai `01-schema.sql` niet nogmaals op dezelfde database; maak een nieuw
  Supabase-project of verwijder eerst alle tabellen.
* Voor een echte livegang gelden de stappen in [`../README.md`](../README.md) (`APP_ENV=production`,
  echte WhatsApp-koppeling, losse worker, geen demo-data).
