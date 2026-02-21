import { createRequire } from "module";

import i18next, { type i18n as I18nInstance, type TFunction } from "i18next";

const require = createRequire(import.meta.url);

const ar = require("./locales/ar.json");
const de = require("./locales/de.json");
const en = require("./locales/en.json");
const es = require("./locales/es.json");
const fr = require("./locales/fr.json");
const hi = require("./locales/hi.json");
const ja = require("./locales/ja.json");
const pt = require("./locales/pt.json");
const ru = require("./locales/ru.json");
const zh = require("./locales/zh.json");

const SUPPORTED_LANGUAGES = ["en", "es", "fr", "de", "pt", "ja", "zh", "ar", "hi", "ru"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const i18n: I18nInstance = i18next.createInstance();

await i18n.init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    fr: { translation: fr },
    de: { translation: de },
    pt: { translation: pt },
    ja: { translation: ja },
    zh: { translation: zh },
    ar: { translation: ar },
    hi: { translation: hi },
    ru: { translation: ru },
  },
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export function getT(lang: string): TFunction {
  const validLang = SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage) ? lang : "en";
  return i18n.getFixedT(validLang);
}

export default i18n;
