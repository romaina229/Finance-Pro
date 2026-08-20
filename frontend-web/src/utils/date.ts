const DATE_LOCALE = 'fr-FR'
const TIME_ZONE = 'Africa/Porto-Novo'

/**
 * Formate une date en français.
 * Exemple : 18/08/2026
 */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat(DATE_LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: TIME_ZONE,
  }).format(date)
}

/**
 * Formate une date avec l'heure.
 * Exemple : 18/08/2026 à 15:35
 */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '—'

  const formatted = new Intl.DateTimeFormat(DATE_LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIME_ZONE,
  }).format(date)

  return formatted.replace(' à ', ' à ')
}

/**
 * Format long.
 * Exemple : 18 août 2026
 */
export function formatDateLong(value: string | Date | null | undefined): string {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat(DATE_LOCALE, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: TIME_ZONE,
  }).format(date)
}

/**
 * Format long avec heure.
 * Exemple : 18 août 2026 à 15:35
 */
export function formatDateTimeLong(value: string | Date | null | undefined): string {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat(DATE_LOCALE, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIME_ZONE,
  }).format(date)
}