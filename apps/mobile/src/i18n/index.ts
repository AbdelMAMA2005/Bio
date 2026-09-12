import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';

export const SUPPORTED_LANGUAGES = ['fr', 'en', 'es'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: SupportedLanguage = 'fr';

const LANGUAGE_STORAGE_KEY = 'planai.language-preference';

const resources = {
  fr: { translation: fr },
  en: { translation: en },
  es: { translation: es },
};

function isSupportedLanguage(value: string | null | undefined): value is SupportedLanguage {
  return !!value && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

function detectDeviceLanguage(): SupportedLanguage {
  const [locale] = Localization.getLocales();
  const code = locale?.languageCode;
  return isSupportedLanguage(code) ? code : DEFAULT_LANGUAGE;
}

export async function initI18n() {
  const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  const initialLanguage = isSupportedLanguage(stored) ? stored : detectDeviceLanguage();

  // i18n est un singleton avec état interne : `use`/`changeLanguage` dépendent de `this`,
  // un import nommé détacherait l'appel de son receveur et casserait l'exécution (vérifié
  // empiriquement) — la caution eslint ci-dessous est un faux positif.
  // eslint-disable-next-line import/no-named-as-default-member
  await i18n.use(initReactI18next).init({
    resources,
    lng: initialLanguage,
    fallbackLng: DEFAULT_LANGUAGE,
    compatibilityJSON: 'v4',
    interpolation: { escapeValue: false },
  });

  return i18n;
}

export async function setAppLanguage(language: SupportedLanguage) {
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  // eslint-disable-next-line import/no-named-as-default-member -- voir commentaire dans initI18n
  await i18n.changeLanguage(language);
}

export function getCurrentLanguage(): SupportedLanguage {
  return isSupportedLanguage(i18n.language) ? i18n.language : DEFAULT_LANGUAGE;
}

export default i18n;
