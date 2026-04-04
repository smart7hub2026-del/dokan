/** نرمال‌سازی شماره برای یکتا بودن (هم‌خوان با فرانت). */
export function customerPhoneKey(raw) {
  const d = String(raw || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('00')) return d.slice(2);
  return d;
}

const PHONE_DIGITS_MIN = 7;
const PHONE_DIGITS_MAX = 18;

/**
 * @param {unknown[]} customers
 * @throws {Error & { code?: string, messageFa?: string }}
 */
export function validateShopCustomersArray(customers) {
  if (!Array.isArray(customers)) return;
  const seen = new Map();
  for (const c of customers) {
    if (!c || typeof c !== 'object') continue;
    const raw = String(c.phone || '').trim();
    const key = customerPhoneKey(raw);
    if (raw) {
      if (!key || key.length < PHONE_DIGITS_MIN || key.length > PHONE_DIGITS_MAX) {
        const err = new Error('INVALID_CUSTOMER_PHONE');
        err.code = 'INVALID_CUSTOMER_PHONE';
        err.messageFa = `شماره موبایل نامعتبر است (${String(c.name || c.id || '')}).`;
        throw err;
      }
    }
    if (c.archived_at) continue;
    if (!key) continue;
    if (seen.has(key)) {
      const err = new Error('DUPLICATE_CUSTOMER_PHONE');
      err.code = 'DUPLICATE_CUSTOMER_PHONE';
      err.messageFa = 'دو مشتری فعال با همین شماره تلفن وجود دارد.';
      throw err;
    }
    seen.set(key, c.id);
  }
}
