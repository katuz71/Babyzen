import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Импортируем JSON файлы
import en from '@/assets/locales/en.json';
import ru from '@/assets/locales/ru.json';
import es from '@/assets/locales/es.json';

const LANGUAGE_KEY = 'app_language';

// Ресурсы переводов
const resources = {
  en: { translation: en },
  ru: { translation: ru },
  es: { translation: es },
};

// Определение языка устройства
const deviceLanguage = Localization.getLocales()[0]?.languageCode || 'en';

// Инициализация с сохранением выбранного языка
const initI18n = async () => {
  let savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);

  // Если язык не сохранен, используем язык устройства
  if (!savedLanguage) {
    savedLanguage = deviceLanguage;
  }

  await i18n
    .use(initReactI18next)
    .init({
      compatibilityJSON: 'v4',
      resources,
      lng: savedLanguage,
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
    });
};

// Функция для смены языка
export const changeLanguage = async (lang: string) => {
  await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  await i18n.changeLanguage(lang);
};

// Запускаем инициализацию
initI18n();

export default i18n;