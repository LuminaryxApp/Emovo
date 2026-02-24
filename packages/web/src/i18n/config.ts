import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import ar from "./locales/ar.json";
import de from "./locales/de.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import hi from "./locales/hi.json";
import ja from "./locales/ja.json";
import pt from "./locales/pt.json";
import ru from "./locales/ru.json";
import zh from "./locales/zh.json";

const LANGUAGE_STORAGE_KEY = "emovo-language";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "es", label: "Spanish", nativeLabel: "Español" },
  { code: "fr", label: "French", nativeLabel: "Français" },
  { code: "de", label: "German", nativeLabel: "Deutsch" },
  { code: "pt", label: "Portuguese", nativeLabel: "Português" },
  { code: "ja", label: "Japanese", nativeLabel: "日本語" },
  { code: "zh", label: "Chinese", nativeLabel: "简体中文" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "ru", label: "Russian", nativeLabel: "Русский" },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["code"];

const SUPPORTED_CODES = SUPPORTED_LANGUAGES.map((l) => l.code);

function getDeviceLanguage(): string {
  if (typeof window === "undefined") return "en";
  const tag = navigator.language?.split("-")[0] ?? "en";
  if (tag.startsWith("zh")) return "zh";
  if (SUPPORTED_CODES.includes(tag as SupportedLanguage)) return tag;
  return "en";
}

function getSavedLanguage(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LANGUAGE_STORAGE_KEY);
}

const savedLang = getSavedLanguage();
const initialLang =
  savedLang && SUPPORTED_CODES.includes(savedLang as SupportedLanguage)
    ? savedLang
    : getDeviceLanguage();

i18n.use(initReactI18next).init({
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
  lng: initialLang,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: "v4",
});

export async function changeLanguage(lang: SupportedLanguage): Promise<void> {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  await i18n.changeLanguage(lang);
}

export function getCurrentLanguage(): SupportedLanguage {
  return (i18n.language || "en") as SupportedLanguage;
}

export default i18n;
