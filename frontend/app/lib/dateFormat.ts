/**
 * Norsk datoformat DD.MM.ÅÅÅÅ (DD.MM.YYYY).
 * Brukes for visning og parsing av datoer i hele appen.
 */

const NO_OPTIONS: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
};

/** Formaterer en dato til norsk format DD.MM.YYYY */
export function formatDateNo(date: Date | string | null | undefined): string {
  if (date == null) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('no-NO', NO_OPTIONS);
}

/** Formaterer dato og tid til norsk format (DD.MM.YYYY, HH:mm) */
export function formatDateTimeNo(date: Date | string | null | undefined): string {
  if (date == null) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('no-NO', {
    ...NO_OPTIONS,
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Parser en streng i norsk format DD.MM.YYYY til ISO-dato YYYY-MM-DD (for lagring/API).
 * Godtar også allerede YYYY-MM-DD og returnerer den uendret.
 */
export function parseDateNo(s: string): string {
  if (!s || typeof s !== 'string') return '';
  const t = s.trim();
  if (!t) return '';
  // Allerede ISO (YYYY-MM-DD)
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (iso) return t;
  // DD.MM.YYYY eller D.M.YYYY
  const no = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(t);
  if (no) {
    const [, day, month, year] = no;
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1900 && y <= 2100) {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${y}-${pad(m)}-${pad(d)}`;
    }
  }
  return '';
}
