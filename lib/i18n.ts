import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Импорт JSON файлов (убедись, что пути правильные!)
import en from '@/assets/locales/en.json';
import ru from '@/assets/locales/ru.json';
import es from '@/assets/locales/es.json';

const LANGUAGE_KEY = 'app_language';

const resources = {
  en: { translation: en },
  ru: { translation: ru },
  es: { translation: es },
};

// Получаем язык телефона (дефолт)
const deviceLanguage = Localization.getLocales()[0]?.languageCode ?? 'en';

// 1. Инициализация СРАЗУ (Синхронно для UI)
i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v4',
    resources,
    lng: deviceLanguage, // Сначала ставим язык телефона, чтобы не было пустоты
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

// 2. Проверка сохраненного языка (Асинхронно в фоне)
AsyncStorage.getItem(LANGUAGE_KEY).then((savedLanguage) => {
  if (savedLanguage && savedLanguage !== deviceLanguage) {
    i18n.changeLanguage(savedLanguage);
  }
});

// Экспорт функции смены языка
export const changeLanguage = async (lang: string) => {
  await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  await i18n.changeLanguage(lang);
};

export default i18n;