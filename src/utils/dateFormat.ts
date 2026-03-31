export type CalendarMode = 'gregorian' | 'jalali';

const toDate = (value: string | Date): Date => {
  if (value instanceof Date) return value;
  const d = new Date(String(value));
  return d;
};

export const formatDateByCalendar = (value: string | Date, calendar: CalendarMode = 'jalali') => {
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return String(value || '');
  const locale = calendar === 'jalali' ? 'fa-AF-u-ca-persian' : 'en-CA';
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
};

export const formatDateTimeByCalendar = (value: string | Date, calendar: CalendarMode = 'jalali') => {
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return String(value || '');
  const locale = calendar === 'jalali' ? 'fa-AF-u-ca-persian' : 'en-CA';
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};

export const formatWeekdayByCalendar = (value: string | Date, calendar: CalendarMode = 'jalali') => {
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return '';
  const locale = calendar === 'jalali' ? 'fa-AF-u-ca-persian' : 'en-US';
  return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d);
};

export const formatMonthLabelByCalendar = (isoYearMonth: string, calendar: CalendarMode = 'jalali') => {
  const [y, m] = String(isoYearMonth || '').split('-');
  if (!y || !m) return isoYearMonth;
  const d = new Date(Number(y), Number(m) - 1, 1);
  if (Number.isNaN(d.getTime())) return isoYearMonth;
  const locale = calendar === 'jalali' ? 'fa-AF-u-ca-persian' : 'en-US';
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short' }).format(d);
};
