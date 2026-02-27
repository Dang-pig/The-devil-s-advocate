import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Locale = 'vi' | 'en' | 'fr' | 'de' | 'ja' | 'zh-CN';

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('vi');
  const [translations, setTranslations] = useState<Record<string, string>>({});

  useEffect(() => {
    import(`../locales/${locale}.json`)
      .then((module) => {
        setTranslations(module.default);
      })
      .catch((err) => {
        console.error(`Failed to load locale: ${locale}`, err);
      });
  }, [locale]);

  const t = (key: string, params?: Record<string, string | number>) => {
    let str = translations[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        str = str.replace(new RegExp(`{${k}}`, 'g'), String(v));
      });
    }
    return str;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
