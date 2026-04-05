import type { CurrencyCode } from '../data/mockData';

/** نرخ: هر واحد ارز خارجی = چند افغانی (مثل currencyRates در استور) */
export function convertToAfn(amount: number, from: CurrencyCode, rates: Record<string, number>): number {
  if (!Number.isFinite(amount)) return 0;
  if (from === 'AFN') return amount;
  const r = rates[from];
  if (r == null || !Number.isFinite(r) || r <= 0) return amount;
  return Math.round(amount * r * 100) / 100;
}

export function convertFromAfn(amountAfn: number, to: CurrencyCode, rates: Record<string, number>): number {
  if (!Number.isFinite(amountAfn)) return 0;
  if (to === 'AFN') return amountAfn;
  const r = rates[to];
  if (r == null || !Number.isFinite(r) || r <= 0) return amountAfn;
  return Math.round((amountAfn / r) * 1000000) / 1000000;
}
