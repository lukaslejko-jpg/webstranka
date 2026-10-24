import sk from "./locales/sk.js";
import en from "./locales/en.js";
import es from "./locales/es.js";
import ptBR from "./locales/pt-BR.js";
import fr from "./locales/fr.js";
import de from "./locales/de.js";
import zhHans from "./locales/zh-Hans.js";

export const DEFAULT_LOCALE = "sk";
export const STR = { sk, en, es, "pt-BR": ptBR, fr, de, "zh-Hans": zhHans };
export const LANGUAGES = [
  { id: "sk", name: "Slovenčina" },
  { id: "en", name: "English" },
  { id: "es", name: "Español (Latinoamérica)" },
  { id: "pt-BR", name: "Português (Brasil)" },
  { id: "fr", name: "Français" },
  { id: "de", name: "Deutsch" },
  { id: "zh-Hans", name: "简体中文" },
];

export const isSupportedLocale = locale => Object.hasOwn(STR, locale);

export function detectLocale(languages = []) {
  for (const language of languages) {
    const parts = String(language).toLowerCase().split("-");
    const base = parts[0];
    if (base === "zh") {
      // Do not label Simplified Chinese as a Traditional Chinese translation.
      if (parts.includes("hant")) continue;
      if (parts.includes("hans")) return "zh-Hans";
      if (parts.some(part => ["tw", "hk", "mo"].includes(part))) continue;
      return "zh-Hans";
    }
    if (base === "pt") return "pt-BR";
    if (isSupportedLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}

export function translate(locale, key, vars = {}) {
  const supported = isSupportedLocale(locale) ? locale : DEFAULT_LOCALE;
  // Brand UI templates before interpolation so user-supplied names stay intact.
  const template = (STR[supported][key] ?? STR[DEFAULT_LOCALE][key] ?? STR.en[key] ?? key)
    .replaceAll("Kasette", "Music Offline");
  return template.replace(/\{\{(\w+)\}\}/g, (placeholder, name) =>
    Object.hasOwn(vars, name) ? String(vars[name]) : placeholder,
  );
}

const plurals = new Map();
export function translateCount(locale, key, n) {
  const supported = isSupportedLocale(locale) ? locale : DEFAULT_LOCALE;
  if (!plurals.has(supported)) plurals.set(supported, new Intl.PluralRules(supported));
  const category = plurals.get(supported).select(n);
  const categoryKey = key + category[0].toUpperCase() + category.slice(1);
  // Locales with only One/Other keep their existing plural wording.
  const countKey = Object.hasOwn(STR[supported], categoryKey) ? categoryKey : key + "Other";
  return translate(supported, countKey, { n });
}
