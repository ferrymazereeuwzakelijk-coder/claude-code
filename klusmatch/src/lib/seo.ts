import { parsePostcode } from './geo';

/** Cities with their own landing pages. A sample postcode places them on the matching map. */
export const CITIES: { slug: string; name: string; postcode: string }[] = [
  { slug: 'utrecht', name: 'Utrecht', postcode: '3511' },
  { slug: 'amersfoort', name: 'Amersfoort', postcode: '3811' },
  { slug: 'zeist', name: 'Zeist', postcode: '3701' },
  { slug: 'nieuwegein', name: 'Nieuwegein', postcode: '3431' },
  { slug: 'houten', name: 'Houten', postcode: '3991' },
  { slug: 'veenendaal', name: 'Veenendaal', postcode: '3901' },
  { slug: 'hilversum', name: 'Hilversum', postcode: '1211' },
  { slug: 'amsterdam', name: 'Amsterdam', postcode: '1011' },
  { slug: 'almere', name: 'Almere', postcode: '1311' },
  { slug: 'haarlem', name: 'Haarlem', postcode: '2011' },
  { slug: 'leiden', name: 'Leiden', postcode: '2311' },
  { slug: 'den-haag', name: 'Den Haag', postcode: '2511' },
  { slug: 'rotterdam', name: 'Rotterdam', postcode: '3011' },
  { slug: 'dordrecht', name: 'Dordrecht', postcode: '3311' },
  { slug: 'gouda', name: 'Gouda', postcode: '2801' },
  { slug: 'den-bosch', name: "'s-Hertogenbosch", postcode: '5211' },
  { slug: 'eindhoven', name: 'Eindhoven', postcode: '5611' },
  { slug: 'tilburg', name: 'Tilburg', postcode: '5011' },
  { slug: 'breda', name: 'Breda', postcode: '4811' },
  { slug: 'arnhem', name: 'Arnhem', postcode: '6811' },
  { slug: 'nijmegen', name: 'Nijmegen', postcode: '6511' },
  { slug: 'apeldoorn', name: 'Apeldoorn', postcode: '7311' },
  { slug: 'zwolle', name: 'Zwolle', postcode: '8011' },
  { slug: 'groningen', name: 'Groningen', postcode: '9711' },
  { slug: 'maastricht', name: 'Maastricht', postcode: '6211' },
];

export function cityBySlug(slug: string) {
  const c = CITIES.find((x) => x.slug === slug);
  if (!c) return null;
  const geo = parsePostcode(c.postcode)!;
  return { ...c, lat: geo.lat, lng: geo.lng };
}

/** Trade-specific copy so every landing page has real, useful content. */
export const TRADE: Record<string, { pro: string; jobs: string[]; tip: string }> = {
  schilderwerk: { pro: 'schilder', jobs: ['Kozijnen en deuren buiten schilderen', 'Woonkamer of slaapkamer verven', 'Schutting of tuinhuis beitsen', 'Houtrot herstellen en lakken'], tip: 'Buitenschilderwerk plan je het best tussen april en oktober, bij droog weer boven de 10 °C.' },
  tuinonderhoud: { pro: 'hovenier', jobs: ['Heg snoeien en afvoeren', 'Gazon maaien, verticuteren of opnieuw inzaaien', 'Tuin winterklaar maken', 'Bomen en struiken snoeien'], tip: 'Snoei de meeste hagen in mei/juni en nog eens in augustus/september.' },
  bestrating: { pro: 'stratenmaker', jobs: ['Terras aanleggen of vernieuwen', 'Oprit bestraten', 'Verzakte tegels ophogen', 'Grind of sierbestrating leggen'], tip: 'Vermeld de oppervlakte in m² en of oude bestrating afgevoerd moet worden.' },
  loodgieter: { pro: 'loodgieter', jobs: ['Lekkage opsporen en verhelpen', 'Verstopte afvoer ontstoppen', 'Kraan of toilet vervangen', 'Waterleiding verleggen'], tip: 'Bij een acute lekkage: draai eerst de hoofdkraan dicht.' },
  elektra: { pro: 'elektricien', jobs: ['Groepenkast vervangen of uitbreiden', 'Extra stopcontacten aanleggen', 'Verlichting installeren', 'Laadpaal laten aansluiten'], tip: 'Werk aan de groepenkast hoort altijd door een erkend installateur te gebeuren.' },
  dakwerk: { pro: 'dakdekker', jobs: ['Lekkend dak repareren', 'Dakgoot vervangen of schoonmaken', 'Platte dakbedekking vernieuwen', 'Dakpannen vervangen'], tip: 'Een foto van de lekplek binnen én van het dak buiten helpt de dakdekker enorm.' },
  timmerwerk: { pro: 'timmerman', jobs: ['Binnendeuren afhangen', 'Schutting plaatsen', 'Laminaat of houten vloer leggen', 'Kast op maat maken'], tip: 'Geef afmetingen op en of materiaal al aanwezig is.' },
  stukadoor: { pro: 'stukadoor', jobs: ['Muren stucen', 'Plafond sauzen of spuiten', 'Scheuren in muren herstellen', 'Behangklaar maken'], tip: 'Noem het aantal m² en of het oud of nieuw werk is.' },
  badkamer: { pro: 'badkamerspecialist', jobs: ['Complete badkamer renoveren', 'Inloopdouche plaatsen', 'Tegels vervangen', 'Toilet en wastafel vernieuwen'], tip: 'Foto’s van de huidige badkamer en een plattegrond met maten versnellen de offerte.' },
  cv_installatie: { pro: 'installateur', jobs: ['CV-ketel vervangen', 'Radiatoren plaatsen of verplaatsen', 'Warmtepomp laten installeren', 'Thermostaat aansluiten'], tip: 'Vermeld het merk en bouwjaar van je huidige ketel.' },
  schoonmaak: { pro: 'schoonmaakbedrijf', jobs: ['Opleveringsschoonmaak', 'Ramen wassen', 'Gevelreiniging', 'Eenmalige grote schoonmaak'], tip: 'Noem de oppervlakte en of het om binnen, buiten of beide gaat.' },
  asbest: { pro: 'asbestsaneerder', jobs: ['Asbestinventarisatie', 'Asbest golfplaten verwijderen', 'Asbesthoudende vloerbedekking verwijderen'], tip: 'Asbest mag alleen door een gecertificeerd bedrijf (SC-530) worden verwijderd. Raak het zelf niet aan.' },
};
