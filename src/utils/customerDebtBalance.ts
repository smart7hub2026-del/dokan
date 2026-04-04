import type { Customer, Debt } from '../data/mockData';

const EPS = 0.5;

/** جمع ماندهٔ قرض‌های باز (مانده > ۰) برای یک مشتری */
export function openDebtRemainingTotal(customerId: number, debts: Debt[]): number {
  return debts
    .filter((d) => d.customer_id === customerId && d.remaining_amount > EPS)
    .reduce((s, d) => s + d.remaining_amount, 0);
}

/**
 * وقتی قرض باز وجود دارد، ماندهٔ حساب (منفی = بدهکار) باید با جمع ماندهٔ قرض‌ها هم‌خوان باشد.
 * بستانکاری (balance مثبت) همراه با قرض باز یعنی داده ناسازگار است.
 */
export function customerOpenDebtBalanceMismatch(customer: Customer, debts: Debt[]): boolean {
  const open = openDebtRemainingTotal(customer.id, debts);
  if (open <= EPS) return false;
  if (customer.balance >= -EPS) return true;
  return Math.abs(Math.abs(customer.balance) - open) > EPS;
}
