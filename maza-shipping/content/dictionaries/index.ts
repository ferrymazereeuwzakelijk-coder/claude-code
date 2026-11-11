import type { Locale } from "../i18n";
import en, { type Dictionary } from "./en";
import nl from "./nl";

const dictionaries: Record<Locale, Dictionary> = { en, nl };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export type { Dictionary };
