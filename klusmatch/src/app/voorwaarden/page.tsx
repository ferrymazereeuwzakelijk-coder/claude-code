import Link from 'next/link';
import { LegalLayout } from '@/components/legal-layout';
import { company, missing } from '@/lib/company';

export const metadata = { title: 'Algemene voorwaarden' };

export default function TermsPage() {
  const c = company();
  return (
    <LegalLayout title="Algemene voorwaarden" updated="18 november 2026">
      <h2>1. Over {c.brand}</h2>
      <p>
        {c.brand} is een dienst van {c.legalName ?? missing} (KvK {c.kvk ?? missing}, {c.address ?? missing}). {c.brand} is een online platform
        dat klanten met een klus in huis of tuin in contact brengt met zelfstandige vakmensen en bedrijven. Deze voorwaarden gelden voor
        het gebruik van de website en van {c.brand} via WhatsApp.
      </p>

      <h2>2. Onze rol</h2>
      <ul>
        <li>{c.brand} bemiddelt alleen. De overeenkomst voor het uitvoeren van een klus komt rechtstreeks tot stand tussen klant en vakman.</li>
        <li>{c.brand} is geen partij bij die overeenkomst en is niet verantwoordelijk voor de uitvoering, de kwaliteit of de betaling van het werk.</li>
        <li>Betalingen voor het werk lopen rechtstreeks tussen klant en vakman, niet via {c.brand}.</li>
      </ul>

      <h2>3. Account en gebruik</h2>
      <ul>
        <li>Je geeft juiste en volledige gegevens op en houdt je inloggegevens geheim.</li>
        <li>Je gebruikt het platform niet voor spam, fraude, ongepaste inhoud of het omzeilen van de beveiliging.</li>
        <li>We mogen accounts en inhoud weigeren, verbergen of verwijderen bij (vermoeden van) misbruik of strijd met deze voorwaarden.</li>
      </ul>

      <h2>4. Voor klanten</h2>
      <ul>
        <li>Plaatsen van een klus is gratis en vrijblijvend. Een klus wordt pas gepubliceerd nadat jij de omschrijving hebt bevestigd.</li>
        <li>Controleer de klusomschrijving: maten, hoeveelheden en aannames van de AI-assistent zijn inschattingen.</li>
        <li>Een offerte is een aanbod van de vakman. Door een offerte te accepteren deel je je contactgegevens met die vakman; de verdere afspraken maak je samen.</li>
        <li>Bij acuut gevaar (zoals een gaslucht) bel je het storingsnummer of 112; {c.brand} is geen spoeddienst.</li>
      </ul>

      <h2>5. Voor vakmensen</h2>
      <ul>
        <li>Je bent ingeschreven bij de KvK en bevoegd en vakkundig om de klussen uit te voeren waarop je reageert, inclusief eventueel vereiste certificeringen (bijvoorbeeld voor asbest of gasinstallaties).</li>
        <li>Je bent zelf verantwoordelijk voor je offertes, de uitvoering, garanties, verzekeringen, belastingen en naleving van wet- en regelgeving.</li>
        <li>Je gebruikt contactgegevens van klanten alleen voor de betreffende klus.</li>
        <li>Wij controleren je KvK-gegevens; verificatie is geen garantie voor de kwaliteit van je werk.</li>
        <li>Zodra betaalde abonnementen worden ingevoerd, ontvang je vooraf de prijzen en voorwaarden; je kiest zelf of je daar gebruik van maakt.</li>
      </ul>

      <h2>6. Hoe we klussen verdelen</h2>
      <p>
        Klussen worden gedeeld met geverifieerde vakmensen op basis van vakgebied, afstand tot de klus binnen hun werkgebied en
        beschikbaarheid. De dichtstbijzijnde vakmensen krijgen als eerste een melding; per vakman geldt een maximum aantal meldingen per dag
        om spam te voorkomen. Er is geen betaalde voorrang in de volgorde.
      </p>

      <h2>7. Reviews</h2>
      <ul>
        <li>Alleen klanten van een via {c.brand} afgeronde klus kunnen een review schrijven over de gekozen vakman.</li>
        <li>Reviews moeten eerlijk zijn en mogen geen persoonsgegevens, beledigingen of reclame bevatten. Wij kunnen reviews die dit niet naleven verbergen.</li>
        <li>Vakmensen kunnen eenmaal openbaar reageren.</li>
      </ul>

      <h2>8. Meldingen en geschillen</h2>
      <p>
        Via het platform kun je ongepaste inhoud melden en, als klant of gekozen vakman, een geschil melden. {c.brand} bemiddelt naar beste
        vermogen, maar neemt geen beslissing die partijen bindt. Klachten over {c.brand} zelf kun je sturen naar {c.email ?? missing}; we
        reageren binnen 14 dagen.
      </p>

      <h2>9. Aansprakelijkheid</h2>
      <p>
        {c.brand} spant zich in om het platform goed te laten werken, maar garandeert niet dat het altijd beschikbaar of foutloos is. Wij zijn
        niet aansprakelijk voor schade die ontstaat uit de overeenkomst of het werk tussen klant en vakman. Voor zover wij wel aansprakelijk
        zijn, is die aansprakelijkheid beperkt tot het bedrag dat je in de twaalf maanden daarvoor aan ons hebt betaald, met een maximum van
        € 500, behalve bij opzet of bewuste roekeloosheid. Dwingend consumentenrecht blijft onverminderd van toepassing.
      </p>

      <h2>10. Wijzigingen en slotbepalingen</h2>
      <p>
        We kunnen deze voorwaarden wijzigen; belangrijke wijzigingen maken we vooraf bekend. Op deze voorwaarden is Nederlands recht van
        toepassing. Zie ook onze <Link href="/privacy" className="underline">privacyverklaring</Link>.
      </p>
    </LegalLayout>
  );
}
