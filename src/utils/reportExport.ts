import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Invoice, Product, Customer, Debt } from '../data/mockData';
import { invoiceCountsTowardFinancialReports } from './invoiceReports';
import { formatDateByCalendar, type CalendarMode } from './dateFormat';

export type ReportType = 'sales' | 'inventory' | 'debts' | 'customers';

type CurrenciesLike = { code: string; exchange_rate: number; symbol?: string }[];

function afnForExcel(
  amount: number,
  viewCurrency: 'AFN' | 'USD' | 'EUR',
  currencies: CurrenciesLike
): number {
  const safe = Number(amount || 0);
  if (viewCurrency === 'AFN') return safe;
  const rate = currencies.find((c) => c.code === viewCurrency)?.exchange_rate || 1;
  return safe / rate;
}

function formatMoneyExcel(n: number, code: 'AFN' | 'USD' | 'EUR'): string {
  const x = Number(n || 0);
  if (code === 'AFN') return `${Math.round(x).toLocaleString('fa-IR')} ؋`;
  return `${x.toLocaleString('fa-IR', { maximumFractionDigits: 2 })} ${code === 'USD' ? '$' : '€'}`;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

const VFS_FONT = 'Vazirmatn-Regular.ttf';
let cachedFontBase64: string | null = null;

/** فونت از همان مبدأ اپ (public/fonts) — بدون اینترنت پس از بارگذاری اولیه */
async function ensureVazirmatnInDoc(doc: jsPDF): Promise<void> {
  const tagged = doc as jsPDF & { __vazirPdf?: boolean };
  if (tagged.__vazirPdf) {
    doc.setFont('Vazirmatn', 'normal');
    return;
  }
  if (!cachedFontBase64) {
    const path = `${import.meta.env.BASE_URL}fonts/Vazirmatn-Regular.ttf`;
    const res = await fetch(path);
    if (!res.ok) {
      throw new Error(`فونت گزارش یافت نشد (${res.status}). فایل public/fonts/Vazirmatn-Regular.ttf را بررسی کنید.`);
    }
    const buf = await res.arrayBuffer();
    cachedFontBase64 = bytesToBase64(new Uint8Array(buf));
  }
  doc.addFileToVFS(VFS_FONT, cachedFontBase64);
  doc.addFont(VFS_FONT, 'Vazirmatn', 'normal');
  tagged.__vazirPdf = true;
  doc.setFont('Vazirmatn', 'normal');
}

export function downloadReportExcel(params: {
  reportType: ReportType;
  dateFrom: string;
  dateTo: string;
  viewCurrency: 'AFN' | 'USD' | 'EUR';
  invoices: Invoice[];
  products: Product[];
  customers: Customer[];
  debts: Debt[];
  currencies: CurrenciesLike;
  calendarMode: CalendarMode;
}): void {
  const {
    reportType,
    dateFrom,
    dateTo,
    viewCurrency,
    invoices,
    products,
    customers,
    debts,
    currencies,
    calendarMode,
  } = params;

  const filteredInvoices = invoices
    .filter(invoiceCountsTowardFinancialReports)
    .filter((i) => i.invoice_date >= dateFrom && i.invoice_date <= dateTo);
  const wb = XLSX.utils.book_new();
  const meta = [
    ['نوع گزارش', reportType],
    ['از تاریخ', dateFrom],
    ['تا تاریخ', dateTo],
    ['نمایش ارز', viewCurrency],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(meta), 'مشخصات');

  if (reportType === 'sales') {
    const totalSales = filteredInvoices.reduce((s, i) => s + i.total, 0);
    const summary = XLSX.utils.aoa_to_sheet([
      ['کل فروش (بازه)', afnForExcel(totalSales, viewCurrency, currencies)],
      ['تعداد فاکتور', filteredInvoices.length],
    ]);
    XLSX.utils.book_append_sheet(wb, summary, 'خلاصه');

    const invRows = filteredInvoices.map((i) => ({
      شماره: i.invoice_number,
      تاریخ: formatDateByCalendar(i.invoice_date, calendarMode),
      مشتری: i.customer_name,
      جمع: afnForExcel(i.total, viewCurrency, currencies),
      پرداخت: i.payment_method === 'cash' ? 'نقدی' : 'نسیه',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invRows), 'فاکتورها');
  } else if (reportType === 'inventory') {
    const rows = products.map((p) => ({
      نام: p.name,
      کد: p.product_code,
      دکان: p.stock_shop,
      گدام: p.stock_warehouse,
      حداقل: p.min_stock,
      قیمت_فروش: p.sale_price,
      ارز: p.currency_code ?? 'AFN',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'موجودی');
  } else if (reportType === 'debts') {
    const rows = debts.map((d) => ({
      مشتری: d.customer_name,
      مبلغ: afnForExcel(d.amount, viewCurrency, currencies),
      پرداخت_شده: afnForExcel(d.paid_amount, viewCurrency, currencies),
      مانده: afnForExcel(d.remaining_amount, viewCurrency, currencies),
      وضعیت: d.status,
      سررسید: formatDateByCalendar(d.due_date, calendarMode),
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'بدهی‌ها');
  } else {
    const rows = [...customers]
      .sort((a, b) => b.total_purchases - a.total_purchases)
      .map((c) => ({
        نام: c.name,
        موبایل: c.phone,
        کل_خرید: afnForExcel(c.total_purchases, viewCurrency, currencies),
        مانده_حساب: afnForExcel(c.balance, viewCurrency, currencies),
        وضعیت: c.status,
      }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'مشتریان');
  }

  const fname = `گزارش-${reportType}-${dateFrom}-${dateTo}.xlsx`;
  XLSX.writeFile(wb, fname);
}

export type ReportPdfParams = {
  reportType: ReportType;
  dateFrom: string;
  dateTo: string;
  viewCurrency: 'AFN' | 'USD' | 'EUR';
  invoices: Invoice[];
  products: Product[];
  customers: Customer[];
  debts: Debt[];
  currencies: CurrenciesLike;
  calendarMode: CalendarMode;
};

export async function downloadReportPdf(params: ReportPdfParams): Promise<void> {
  const {
    reportType,
    dateFrom,
    dateTo,
    viewCurrency,
    invoices,
    products,
    customers,
    debts,
    currencies,
    calendarMode,
  } = params;

  const fmt = (afnAmount: number) => formatMoneyExcel(afnForExcel(afnAmount, viewCurrency, currencies), viewCurrency);
  const filteredInvoices = invoices
    .filter(invoiceCountsTowardFinancialReports)
    .filter((i) => i.invoice_date >= dateFrom && i.invoice_date <= dateTo);

  const title =
    reportType === 'sales'
      ? 'گزارش فروش'
      : reportType === 'inventory'
        ? 'گزارش موجودی'
        : reportType === 'debts'
          ? 'گزارش بدهی‌ها'
          : 'گزارش مشتریان';

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
  await ensureVazirmatnInDoc(doc);

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 10;
  let y = 12;
  doc.setFontSize(13);
  doc.text(title, pageW / 2, y, { align: 'center' });
  y += 6;
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`بازه: ${dateFrom} تا ${dateTo} — نمایش ارز: ${viewCurrency}`, pageW / 2, y, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  y += 8;

  const tableStyle = {
    styles: {
      font: 'Vazirmatn',
      fontStyle: 'normal' as const,
      fontSize: 7.5,
      halign: 'right' as const,
      cellPadding: 1.5,
    },
    headStyles: {
      fillColor: [51, 65, 85] as [number, number, number],
      font: 'Vazirmatn',
      fontStyle: 'normal' as const,
      halign: 'right' as const,
      fontSize: 7.5,
    },
    margin: { left: margin, right: margin },
    theme: 'grid' as const,
    startY: y,
  };

  if (reportType === 'sales') {
    const totalSales = filteredInvoices.reduce((s, i) => s + i.total, 0);
    const subY = y + 4;
    doc.setFontSize(8);
    doc.text(`جمع فروش: ${fmt(totalSales)} — تعداد فاکتور: ${filteredInvoices.length}`, pageW / 2, subY, { align: 'center' });
    autoTable(doc, {
      ...tableStyle,
      startY: subY + 5,
      head: [['شماره', 'تاریخ', 'مشتری', 'جمع', 'پرداخت']],
      body: filteredInvoices.map((i) => [
        i.invoice_number,
        formatDateByCalendar(i.invoice_date, calendarMode),
        i.customer_name,
        fmt(i.total),
        i.payment_method === 'cash' ? 'نقدی' : 'نسیه',
      ]),
    });
  } else if (reportType === 'inventory') {
    autoTable(doc, {
      ...tableStyle,
      head: [['نام', 'کد', 'دکان', 'گدام', 'حداقل']],
      body: products.map((p) => [
        p.name,
        p.product_code,
        String(p.stock_shop),
        String(p.stock_warehouse),
        String(p.min_stock),
      ]),
    });
  } else if (reportType === 'debts') {
    autoTable(doc, {
      ...tableStyle,
      head: [['مشتری', 'مبلغ', 'پرداخت', 'مانده', 'سررسید']],
      body: debts.map((d) => [
        d.customer_name,
        fmt(d.amount),
        fmt(d.paid_amount),
        fmt(d.remaining_amount),
        formatDateByCalendar(d.due_date, calendarMode),
      ]),
    });
  } else {
    autoTable(doc, {
      ...tableStyle,
      head: [['نام', 'موبایل', 'کل خرید', 'مانده']],
      body: [...customers]
        .sort((a, b) => b.total_purchases - a.total_purchases)
        .map((c) => [c.name, c.phone, fmt(c.total_purchases), fmt(c.balance)]),
    });
  }

  doc.save(`گزارش-${reportType}-${dateFrom}-${dateTo}.pdf`);
}
