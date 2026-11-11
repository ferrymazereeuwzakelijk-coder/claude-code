import type { Locale } from "@/lib/i18n";
import { en } from "./en";
import { nl, type Dictionary } from "./nl";

const dictionaries: Record<Locale, Dictionary> = { nl, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export type { Dictionary };
