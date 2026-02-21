import type { Locale } from "date-fns";
import { enUS, es, fr, de, pt, ja, zhCN, ar, hi, ru } from "date-fns/locale";

import type { SupportedLanguage } from "./config";

const localeMap: Record<SupportedLanguage, Locale> = {
  en: enUS,
  es: es,
  fr: fr,
  de: de,
  pt: pt,
  ja: ja,
  zh: zhCN,
  ar: ar,
  hi: hi,
  ru: ru,
};

export function getDateLocale(lang: SupportedLanguage): Locale {
  return localeMap[lang] || enUS;
}
