/** ارقام برای تطبیق تکراری و لینک واتساپ */
export function customerPhoneDigits(raw: string): string {
  return String(raw || '').replace(/\D/g, '');
}

export function customerPhoneKey(raw: string): string {
  const d = customerPhoneDigits(raw);
  if (!d) return '';
  if (d.startsWith('00')) return d.slice(2);
  return d;
}

/**
 * شمارهٔ نمایش داده‌شده برای wa.me (بدون +).
 * - اگر کاربر کد کشور کامل وارد کرده باشد (مثلاً 98912...) همان استفاده می‌شود.
 * - اگر با 0 محلی شروع شود (مثلاً 079، 0912) همان 0 حذف و dialCode الصاق می‌شود.
 * - dialCode خالی: فقط ارقام غیرخالی برمی‌گردد (مسئولیت با کاربر).
 */
export function toWhatsAppDialNumber(
  rawPhoneOrWhatsapp: string,
  defaultCountryCallingCode: string
): string {
  const dial = String(defaultCountryCallingCode || '').replace(/\D/g, '');
  let d = customerPhoneDigits(rawPhoneOrWhatsapp);
  if (!d) return '';
  if (d.startsWith('00')) d = d.slice(2);
  if (!dial) return d;
  if (d.length >= 11 && (d.startsWith('1') || d.startsWith('7') || d.startsWith('9'))) {
    return d;
  }
  if (d.startsWith('0')) {
    return `${dial}${d.slice(1)}`;
  }
  if (d.length <= 10) {
    return `${dial}${d}`;
  }
  return d;
}
