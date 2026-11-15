import * as Localization from 'expo-localization';
import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import en from './en.json';
import he from './he.json';
import { pluralCategory } from './plural';
import ru from './ru.json';

export type Language = 'he' | 'en' | 'ru';
export type Direction = 'rtl' | 'ltr';
type Params = Record<string, string | number>;

export const LANGUAGES: { code: Language; nativeName: string }[] = [
  { code: 'he', nativeName: 'עברית' },
  { code: 'en', nativeName: 'English' },
  { code: 'ru', nativeName: 'Русский' },
];

const dictionaries: Record<Language, unknown> = { he, en, ru };
const RTL_LANGUAGES = new Set<Language>(['he']);
const STORAGE_KEY = 'veyra.language';

function isLanguage(value: unknown): value is Language {
  return value === 'he' || value === 'en' || value === 'ru';
}

function deviceLanguage(): Language {
  const code = Localization.getLocales()[0]?.languageCode;
  if (code === 'he' || code === 'iw') return 'he';
  if (code === 'ru') return 'ru';
  return 'en';
}

function lookup(dict: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => {
    if (node && typeof node === 'object' && part in node) {
      return (node as Record<string, unknown>)[part];
    }
    return undefined;
  }, dict);
}

function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

type I18nContextValue = {
  language: Language;
  direction: Direction;
  isRTL: boolean;
  ready: boolean;
  setLanguage: (language: Language) => Promise<void>;
  t: (key: string, params?: Params) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(deviceLanguage);
  const [ready, setReady] = useState(false);

  // Restore the language the user picked last time.
  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((stored) => {
        if (isLanguage(stored)) setLanguageState(stored);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const setLanguage = useCallback(async (next: Language) => {
    setLanguageState(next);
    try {
      await SecureStore.setItemAsync(STORAGE_KEY, next);
    } catch {
      // Not critical: the choice still applies for this session.
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Params): string => {
      const value = lookup(dictionaries[language], key) ?? lookup(dictionaries.en, key);

      if (typeof value === 'string') {
        return interpolate(value, params);
      }

      if (value && typeof value === 'object' && typeof params?.count === 'number') {
        const forms = value as Record<string, string>;
        const form = forms[pluralCategory(language, params.count)] ?? forms.other;
        if (typeof form === 'string') return interpolate(form, params);
      }

      if (__DEV__) console.warn(`[i18n] Missing key "${key}" for "${language}"`);
      return key;
    },
    [language],
  );

  const value = useMemo<I18nContextValue>(() => {
    const isRTL = RTL_LANGUAGES.has(language);
    return { language, direction: isRTL ? 'rtl' : 'ltr', isRTL, ready, setLanguage, t };
  }, [language, ready, setLanguage, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}

// Safe outside the provider (falls back to LTR); used by low-level UI components.
export function useIsRTL(): boolean {
  return useContext(I18nContext)?.isRTL ?? false;
}