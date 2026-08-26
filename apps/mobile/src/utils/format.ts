import { formatDistanceToNowStrict } from 'date-fns';
import { es as esLocale, fr as frLocale } from 'date-fns/locale';
import type { TFunction } from 'i18next';

import type { SupportedLanguage } from '@/i18n';

const DATE_FNS_LOCALES = {
  fr: frLocale,
  en: undefined,
  es: esLocale,
} as const;

export function formatRelativeDate(iso: string, language: SupportedLanguage): string {
  return formatDistanceToNowStrict(new Date(iso), {
    addSuffix: true,
    locale: DATE_FNS_LOCALES[language],
  });
}

export function formatDistance(meters: number, language: SupportedLanguage, t: TFunction): string {
  const numberFormat = new Intl.NumberFormat(language);
  if (meters < 1000) {
    return t('distance.meters', { value: numberFormat.format(Math.round(meters / 10) * 10) });
  }
  const km = Math.round((meters / 1000) * 10) / 10;
  return t('distance.kilometers', { value: numberFormat.format(km) });
}

export function formatUsername(username: string | null | undefined): string {
  const clean = (username ?? '').replace(/^@+/, '');
  return clean ? `@${clean}` : '@';
}
