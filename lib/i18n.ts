import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

// JSON локали
import en from '@/assets/locales/en.json';
import ru from '@/assets/locales/ru.json';
import es from '@/assets/locales/es.json';

const LANGUAGE_KEY = 'app_language';

const SUPPORTED_LANGUAGES = ['ru', 'en', 'es'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const resources = {
  en: { translation: en },
  ru: { translation: ru },
  es: { translation: es },
} as const;

function normalizeLanguage(input: unknown): AppLanguage {
  const lang = String(input || '').toLowerCase();
  if (SUPPORTED_LANGUAGES.includes(lang as AppLanguage)) return lang as AppLanguage;
  return 'en';
}

// Язык устройства (только ru/en/es, иначе en)
const deviceLanguage: AppLanguage = normalizeLanguage(
  Localization.getLocales()[0]?.languageCode ?? 'en'
);

// 1) Синхронная инициализация (чтобы UI не мигал)
i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources,
  lng: deviceLanguage,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

// 2) Асинхронно поднимаем сохранённый выбор (если был)
AsyncStorage.getItem(LANGUAGE_KEY)
  .then((saved) => {
    if (!saved) return;

    const savedLang = normalizeLanguage(saved);

    // Если сохранённый отличается от текущего — применяем
    if (savedLang !== i18n.language) {
      i18n.changeLanguage(savedLang);
    }
  })
  .catch(() => {
    // игнорируем ошибки чтения (например, первый запуск)
  });

// Экспорт функции смены языка (используй в онбординге)
export const changeLanguage = async (lang: AppLanguage) => {
  const normalized = normalizeLanguage(lang);
  await AsyncStorage.setItem(LANGUAGE_KEY, normalized);
  await i18n.changeLanguage(normalized);
};

export default i18n;
