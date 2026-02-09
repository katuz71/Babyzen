import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

// Ресурсы переводов
const resources = {
  en: {
    translation: {
      welcome: "Welcome to BabyZen",
      listening: "Listening...",
      analyze: "Analyze Cry",
      result_hunger: "Hunger",
      result_pain: "Pain",
      result_tired: "Tired",
      advice_feed: "Time to feed based on the 'Neh' sound.",
      premium_banner: "Get full access to AI Mentor",
    },
  },
  ru: {
    translation: {
      welcome: "Добро пожаловать в BabyZen",
      listening: "Слушаю...",
      analyze: "Анализ плача",
      result_hunger: "Голод",
      result_pain: "Боль",
      result_tired: "Усталость",
      advice_feed: "Похоже на голод (звук 'Neh'). Пора кормить.",
      premium_banner: "Получить доступ к AI Ментору",
    },
  },
};

// Определение языка устройства
const deviceLanguage = Localization.getLocales()[0]?.languageCode || 'en';

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v4',
    resources,
    lng: deviceLanguage, // Авто-выбор языка
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;