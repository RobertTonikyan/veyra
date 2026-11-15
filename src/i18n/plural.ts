import type { Language } from './index';

export type PluralCategory = 'one' | 'two' | 'few' | 'many' | 'other';

// Explicit rules for our three languages, so we don't depend on Intl.PluralRules
// being available in every JS engine build.
export function pluralCategory(language: Language, count: number): PluralCategory {
  const n = Math.abs(count);

  switch (language) {
    case 'he':
      if (n === 1) return 'one';
      if (n === 2) return 'two';
      return 'other';

    case 'ru': {
      if (!Number.isInteger(n)) return 'other';
      const mod10 = n % 10;
      const mod100 = n % 100;
      if (mod10 === 1 && mod100 !== 11) return 'one';
      if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'few';
      return 'many';
    }

    default:
      return n === 1 ? 'one' : 'other';
  }
}