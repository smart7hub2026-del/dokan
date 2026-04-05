import type { Invoice } from '../data/mockData';

/**
 * فقط فاکتورهای تأییدشده / نهایی‌شده در گزارش مالی و داشبورد فروش لحاظ می‌شوند.
 * فاکتور پرسنل با stock_committed === false تا تأیید مدیر خارج از جمع فروش است.
 */
export function invoiceCountsTowardFinancialReports(inv: Invoice): boolean {
  if (inv.status === 'rejected' || inv.approval_status === 'rejected') return false;
  if (inv.stock_committed === true) return true;
  if (inv.stock_committed === false) return false;
  return inv.approval_status === 'approved' || inv.status === 'completed';
}
