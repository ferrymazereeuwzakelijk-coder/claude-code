import type { Locale } from "../i18n";
import en, { type Dictionary } from "./en";
import nl from "./nl";
import de from "./de";

const dictionaries: Record<Locale, Dictionary> = { nl, en, de };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export type { Dictionary };
