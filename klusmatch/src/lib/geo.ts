/**
 * Approximate centroids per Dutch 2-digit postcode region (PC2).
 *
 * This is a deliberately coarse, self-contained dataset so matching works without
 * external services. Accuracy is roughly ±10–15 km. For production, replace with the
 * CBS/PDOK PC4 centroid dataset (≈4,000 rows) loaded into a `postcode_centroids` table.
 */
const PC2: Record<string, [number, number, string]> = {
  '10': [52.372, 4.893, 'Amsterdam'], '11': [52.31, 4.92, 'Amsterdam-Zuidoost / Amstelveen'],
  '12': [52.223, 5.176, 'Hilversum'], '13': [52.37, 5.216, 'Almere'], '14': [52.505, 4.96, 'Purmerend'],
  '15': [52.44, 4.815, 'Zaandam'], '16': [52.643, 5.06, 'Hoorn'], '17': [52.78, 4.81, 'Heerhugowaard / Den Helder'],
  '18': [52.632, 4.749, 'Alkmaar'], '19': [52.483, 4.66, 'Beverwijk'], '20': [52.381, 4.637, 'Haarlem'],
  '21': [52.3, 4.69, 'Hoofddorp'], '22': [52.22, 4.45, 'Noordwijk / Katwijk'], '23': [52.16, 4.497, 'Leiden'],
  '24': [52.129, 4.657, 'Alphen aan den Rijn'], '25': [52.078, 4.3, 'Den Haag'], '26': [52.012, 4.357, 'Delft'],
  '27': [52.06, 4.494, 'Zoetermeer'], '28': [52.017, 4.708, 'Gouda'], '29': [51.9, 4.6, 'Capelle / Ridderkerk'],
  '30': [51.922, 4.479, 'Rotterdam'], '31': [51.913, 4.36, 'Schiedam / Vlaardingen'], '32': [51.845, 4.33, 'Spijkenisse'],
  '33': [51.813, 4.69, 'Dordrecht'], '34': [52.03, 5.09, 'Nieuwegein'], '35': [52.09, 5.121, 'Utrecht'],
  '36': [52.14, 5.04, 'Maarssen'], '37': [52.09, 5.233, 'Zeist'], '38': [52.156, 5.387, 'Amersfoort'],
  '39': [52.03, 5.556, 'Veenendaal'], '40': [51.887, 5.43, 'Tiel'], '41': [51.958, 5.227, 'Culemborg'],
  '42': [51.83, 4.97, 'Gorinchem'], '43': [51.65, 3.92, 'Zierikzee'], '44': [51.504, 3.888, 'Goes'],
  '45': [51.335, 3.828, 'Terneuzen'], '46': [51.495, 4.29, 'Bergen op Zoom'], '47': [51.53, 4.465, 'Roosendaal'],
  '48': [51.589, 4.776, 'Breda'], '49': [51.645, 4.86, 'Oosterhout'], '50': [51.555, 5.091, 'Tilburg'],
  '51': [51.68, 5.06, 'Waalwijk'], '52': [51.699, 5.304, "'s-Hertogenbosch"], '53': [51.765, 5.518, 'Oss'],
  '54': [51.656, 5.618, 'Uden'], '55': [51.41, 5.42, 'Veldhoven'], '56': [51.441, 5.47, 'Eindhoven'],
  '57': [51.48, 5.656, 'Helmond'], '58': [51.53, 5.98, 'Venray'], '59': [51.37, 6.172, 'Venlo'],
  '60': [51.25, 5.75, 'Weert'], '61': [51.0, 5.87, 'Sittard'], '62': [50.851, 5.691, 'Maastricht'],
  '63': [50.87, 5.9, 'Valkenburg'], '64': [50.888, 5.98, 'Heerlen'], '65': [51.842, 5.853, 'Nijmegen'],
  '66': [51.81, 5.72, 'Wijchen'], '67': [52.04, 5.665, 'Ede / Wageningen'], '68': [51.985, 5.899, 'Arnhem'],
  '69': [51.93, 6.07, 'Zevenaar'], '70': [51.965, 6.289, 'Doetinchem'], '71': [51.97, 6.72, 'Winterswijk'],
  '72': [52.138, 6.2, 'Zutphen'], '73': [52.211, 5.969, 'Apeldoorn'], '74': [52.255, 6.163, 'Deventer'],
  '75': [52.221, 6.894, 'Enschede'], '76': [52.357, 6.663, 'Almelo'], '77': [52.575, 6.62, 'Hardenberg'],
  '78': [52.785, 6.897, 'Emmen'], '79': [52.72, 6.48, 'Hoogeveen'], '80': [52.512, 6.091, 'Zwolle'],
  '81': [52.39, 6.27, 'Raalte'], '82': [52.518, 5.471, 'Lelystad'], '83': [52.71, 5.75, 'Emmeloord'],
  '84': [52.96, 5.92, 'Heerenveen'], '85': [52.965, 5.79, 'Joure'], '86': [53.03, 5.66, 'Sneek'],
  '87': [53.06, 5.53, 'Bolsward'], '88': [53.17, 5.42, 'Harlingen'], '89': [53.201, 5.799, 'Leeuwarden'],
  '90': [53.17, 5.95, 'Grou'], '91': [53.326, 5.998, 'Dokkum'], '92': [53.11, 6.1, 'Drachten'],
  '93': [53.14, 6.43, 'Roden'], '94': [52.993, 6.564, 'Assen'], '95': [52.99, 6.95, 'Stadskanaal'],
  '96': [53.16, 6.76, 'Hoogezand / Veendam'], '97': [53.219, 6.567, 'Groningen'], '98': [53.25, 6.4, 'Zuidhorn'],
  '99': [53.32, 6.86, 'Delfzijl'],
};

export type PostcodeInfo = { postcode4: string; postcodeFull: string | null; lat: number; lng: number; region: string };

const FULL_RE = /\b([1-9][0-9]{3})\s?([A-Za-z]{2})\b/;
const PC4_RE = /\b([1-9][0-9]{3})\b/;

/** Parses "1234 AB", "1234AB" or "1234". Returns null when not a valid Dutch postcode. */
export function parsePostcode(input: string): PostcodeInfo | null {
  const full = input.match(FULL_RE);
  const pc4 = full?.[1] ?? input.match(PC4_RE)?.[1];
  if (!pc4) return null;
  const letters = full?.[2]?.toUpperCase();
  // SA, SD and SS are never issued in Dutch postcodes.
  if (letters && ['SA', 'SD', 'SS'].includes(letters)) return null;
  const centroid = PC2[pc4.slice(0, 2)];
  if (!centroid) return null;
  return {
    postcode4: pc4,
    postcodeFull: letters ? `${pc4} ${letters}` : null,
    lat: centroid[0],
    lng: centroid[1],
    region: centroid[2],
  };
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
