import Link from 'next/link';
import { LegalLayout } from '@/components/legal-layout';
import { company, missing } from '@/lib/company';

export const metadata = { title: 'Privacyverklaring' };

export default function PrivacyPage() {
  const c = company();
  return (
    <LegalLayout title="Privacyverklaring" updated="18 november 2026">
      <p>
        {c.brand} brengt klanten met een klus in huis of tuin in contact met vakmensen. Daarvoor verwerken wij persoonsgegevens. In deze
        verklaring leggen we uit welke gegevens, waarom, hoe lang en welke rechten je hebt.
      </p>

      <h2>1. Wie zijn wij</h2>
      <p>
        Verwerkingsverantwoordelijke is {c.legalName ?? missing}, ingeschreven bij de KvK onder nummer {c.kvk ?? missing}, gevestigd op{' '}
        {c.address ?? missing}. Vragen over privacy: {c.email ?? missing}.
      </p>

      <h2>2. Welke gegevens we verwerken</h2>
      <ul>
        <li><strong>Accountgegevens:</strong> naam, e-mailadres, wachtwoord (alleen versleuteld opgeslagen) en rol (klant of vakman).</li>
        <li><strong>WhatsApp:</strong> je telefoonnummer, profielnaam, berichten en foto's die je ons stuurt, en je toestemming of afmelding.</li>
        <li><strong>Klusgegevens:</strong> omschrijving, foto's en video's, postcode, gewenste planning en budget.</li>
        <li><strong>Vakmensen:</strong> bedrijfsnaam, KvK-nummer, vestigingspostcode, werkgebied, vakgebieden, portfolio, offertes en reviews.</li>
        <li><strong>Berichten</strong> tussen klant en vakman via het platform.</li>
        <li><strong>Technische gegevens:</strong> IP-adres en browsergegevens bij inloggen, voor beveiliging en het voorkomen van misbruik.</li>
      </ul>

      <h2>3. Waarvoor en op welke grondslag</h2>
      <ul>
        <li>Het uitvoeren van onze dienst: je klus omzetten in een opdracht, matchen met vakmensen, offertes en berichten doorgeven (uitvoering van de overeenkomst).</li>
        <li>Contact via WhatsApp: alleen nadat je daar uitdrukkelijk mee hebt ingestemd (toestemming). Afmelden kan altijd met <strong>STOP</strong>.</li>
        <li>Beveiliging, fraudepreventie en het controleren van vakmensen (gerechtvaardigd belang).</li>
        <li>Het bewaren van gegevens die we wettelijk moeten bewaren, zoals de administratie (wettelijke plicht).</li>
      </ul>

      <h2>4. Wat vakmensen van je zien</h2>
      <p>
        Vakmensen zien de omschrijving, foto's, de regio en de eerste vier cijfers van je postcode. Je naam, volledige postcode en
        telefoonnummer delen we pas met de vakman wiens offerte jij accepteert. Reviews worden gepubliceerd met alleen je voornaam.
      </p>

      <h2>5. Automatische verwerking (AI)</h2>
      <p>
        Een AI-assistent helpt je klus te beschrijven: hij stelt vragen, herkent het soort klus en kan foto's beschrijven. Aannames van de AI
        worden altijd als zodanig gemarkeerd en niets wordt geplaatst zonder jouw bevestiging. Er worden geen besluiten met rechtsgevolgen
        uitsluitend automatisch genomen. Bij mogelijk gevaarlijke situaties beoordeelt een medewerker je aanvraag.
      </p>

      <h2>6. Met wie we gegevens delen</h2>
      <p>We werken met zorgvuldig gekozen dienstverleners (verwerkers), met wie verwerkersafspraken gelden:</p>
      <ul>
        <li>Supabase (database en opslag van foto's, servers in de EU)</li>
        <li>Vercel (hosting van de website)</li>
        <li>Meta Platforms (WhatsApp Business), alleen als je ons via WhatsApp benadert</li>
        <li>Anthropic (AI-verwerking van berichten en foto's voor de klusomschrijving)</li>
        <li>Stripe (betalingen van vakmensen, zodra abonnementen actief zijn)</li>
      </ul>
      <p>
        Sommige van deze partijen kunnen gegevens buiten de Europese Economische Ruimte verwerken. Dat gebeurt alleen met passende
        waarborgen, zoals het EU-VS Data Privacy Framework of de standaardcontractbepalingen van de Europese Commissie. We verkopen nooit
        persoonsgegevens.
      </p>

      <h2>7. Hoe lang we gegevens bewaren</h2>
      <ul>
        <li>Accounts: zolang je account bestaat; na opzegging verwijderen of anonimiseren we je gegevens binnen 30 dagen, behalve wat we wettelijk moeten bewaren.</li>
        <li>Klussen, offertes en berichten: tot 2 jaar na afronding van de klus, voor eventuele geschillen.</li>
        <li>Afgebroken aanvragen (niet geplaatst): maximaal 90 dagen.</li>
        <li>Beveiligingslogboeken: maximaal 1 jaar.</li>
        <li>Afmeldingen voor WhatsApp en e-mail bewaren we zolang nodig om je niet opnieuw te benaderen.</li>
      </ul>

      <h2>8. Je rechten</h2>
      <p>
        Je hebt recht op inzage, correctie, verwijdering, beperking, overdraagbaarheid en bezwaar, en je kunt gegeven toestemming altijd
        intrekken. Stuur je verzoek naar {c.email ?? missing}; we reageren binnen een maand. Ben je het niet eens met hoe we met je gegevens
        omgaan, dan kun je een klacht indienen bij de Autoriteit Persoonsgegevens (autoriteitpersoonsgegevens.nl).
      </p>

      <h2>9. Beveiliging</h2>
      <p>
        We beveiligen gegevens met onder meer versleutelde verbindingen, versleuteld opgeslagen wachtwoorden, toegangscontrole per rol,
        beperkte bevoegdheden van systemen en het bijhouden van een auditlog.
      </p>

      <h2>10. Contact van vakmensen voor aanmelding</h2>
      <p>
        Wij benaderen bedrijven (rechtspersonen) via hun openbare algemene bedrijfsadres om hen uit te nodigen voor het platform. Wil je
        niet meer benaderd worden, antwoord dan op onze e-mail; we voegen je adres dan toe aan onze afmeldlijst.
      </p>

      <p className="pt-6 text-sm text-navy-400">
        Zie ook onze <Link href="/voorwaarden" className="underline">algemene voorwaarden</Link>.
      </p>
    </LegalLayout>
  );
}
