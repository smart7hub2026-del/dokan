import type { InvoiceItem } from '../data/mockData';

export function escapeHtmlPrint(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** برچسب فارسی منبع موجودی برای چاپ فاکتور */
export function invoiceStockSourceLabel(src?: InvoiceItem['stock_source']): string {
  return src === 'warehouse' ? 'گدام (انبار)' : 'مغازه (دکان)';
}

export function splitInvoiceItemsByStockSource(items: InvoiceItem[]) {
  const shop: InvoiceItem[] = [];
  const warehouse: InvoiceItem[] = [];
  for (const it of items) {
    if (it.stock_source === 'warehouse') warehouse.push(it);
    else shop.push(it);
  }
  return { shop, warehouse };
}

export function sumInvoiceLineTotals(items: InvoiceItem[]): number {
  return items.reduce((s, i) => s + Number(i.total_price || 0), 0);
}

export type InvoicePrintAudience = 'customer' | 'internal';

/**
 * نسخهٔ مشتری: یک جدول با ستون «محل فروش».
 */
export function buildCustomerInvoiceItemsTableHtml(
  items: InvoiceItem[],
  isThermal: boolean,
  esc: (s: string) => string
): string {
  const thPad = isThermal ? '2px 3px' : '4px 6px';
  const tdPad = isThermal ? '2px 3px' : '3px 6px';
  const fs = isThermal ? '8px' : '10px';
  const rows = items
    .map(
      (i) => `<tr>
    <td>${esc(i.product_name)}</td>
    <td style="text-align:center;font-weight:600">${esc(invoiceStockSourceLabel(i.stock_source))}</td>
    <td style="text-align:center">${i.quantity}</td>
    <td style="text-align:left">${i.unit_price.toLocaleString()} ؋</td>
    <td style="text-align:left">${i.total_price.toLocaleString()} ؋</td>
  </tr>`
    )
    .join('');
  return `<table>
  <thead><tr>
    <th style="padding:${thPad};font-size:${fs}">محصول</th>
    <th style="padding:${thPad};font-size:${fs}">محل فروش</th>
    <th style="padding:${thPad};font-size:${fs}">تعداد</th>
    <th style="padding:${thPad};font-size:${fs}">قیمت</th>
    <th style="padding:${thPad};font-size:${fs}">جمع</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>`;
}

function oneSectionTable(
  title: string,
  sectionItems: InvoiceItem[],
  isThermal: boolean,
  esc: (s: string) => string
): string {
  if (sectionItems.length === 0) return '';
  const thPad = isThermal ? '2px 3px' : '4px 6px';
  const tdPad = isThermal ? '2px 3px' : '3px 6px';
  const fs = isThermal ? '8px' : '10px';
  const titleFs = isThermal ? '9px' : '11px';
  const sub = sumInvoiceLineTotals(sectionItems);
  const rows = sectionItems
    .map(
      (i) => `<tr>
    <td>${esc(i.product_name)}</td>
    <td style="text-align:center">${i.quantity}</td>
    <td style="text-align:left">${i.unit_price.toLocaleString()} ؋</td>
    <td style="text-align:left">${i.total_price.toLocaleString()} ؋</td>
  </tr>`
    )
    .join('');
  return `<div class="loc-block" style="margin-bottom:${isThermal ? '8px' : '14px'}">
  <div class="loc-title" style="font-weight:700;font-size:${titleFs};margin:0 0 ${isThermal ? '4px' : '6px'} 0;padding:${isThermal ? '4px 6px' : '6px 8px'};background:#1e3a5f;color:#fff;border-radius:4px;text-align:center">${esc(
    title
  )}</div>
  <table>
    <thead><tr>
      <th style="padding:${thPad};font-size:${fs}">محصول</th>
      <th style="padding:${thPad};font-size:${fs}">تعداد</th>
      <th style="padding:${thPad};font-size:${fs}">قیمت</th>
      <th style="padding:${thPad};font-size:${fs}">جمع</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="loc-sub" style="display:flex;justify-content:space-between;font-size:${fs};font-weight:600;margin-top:4px;padding:2px 4px;background:#f0f4f8;border-radius:3px">
    <span>جمع این بخش:</span><span>${sub.toLocaleString()} ؋</span>
  </div>
</div>`;
}

/**
 * نسخهٔ داخلی: جداول جدا برای «مغازه» و «گدام» + جمع جزئی هر بخش.
 */
/** دکان اول، سپس هر گدام به‌ترتیب شناسهٔ سطل (۱، ۳، ۴، …). */
export function groupInvoiceLineItemsByLocation(items: InvoiceItem[]): { title: string; items: InvoiceItem[] }[] {
  const shop: InvoiceItem[] = [];
  const byBin = new Map<number, InvoiceItem[]>();
  for (const it of items) {
    if ((it.stock_source ?? 'shop') === 'shop') {
      shop.push(it);
    } else {
      const bidRaw = it.warehouse_bin_id;
      const bid = Number.isFinite(Number(bidRaw)) ? Number(bidRaw) : 1;
      if (!byBin.has(bid)) byBin.set(bid, []);
      byBin.get(bid)!.push(it);
    }
  }
  const out: { title: string; items: InvoiceItem[] }[] = [];
  if (shop.length) {
    out.push({ title: 'اقلام فروخته‌شده از مغازه (دکان)', items: shop });
  }
  const sortedBins = [...byBin.entries()].sort((a, b) => a[0] - b[0]);
  for (const [bid, rows] of sortedBins) {
    const lbl = rows[0]?.warehouse_bin_label?.trim() || `گدام ${bid}`;
    out.push({ title: `اقلام فروخته‌شده از ${lbl}`, items: rows });
  }
  if (out.length === 0 && items.length) {
    out.push({ title: 'اقلام فاکتور', items: [...items] });
  }
  return out;
}

export function buildInternalInvoiceItemsTablesHtml(
  items: InvoiceItem[],
  isThermal: boolean,
  esc: (s: string) => string
): string {
  const sections = groupInvoiceLineItemsByLocation(items);
  const parts = sections.map((s) => oneSectionTable(s.title, s.items, isThermal, esc));
  const joined = parts.filter(Boolean).join('');
  if (joined) return joined;
  return buildCustomerInvoiceItemsTableHtml(items, isThermal, esc);
}

export function invoicePrintAudienceForCopyIndex(
  copyMode: 'single' | 'duplicate' | 'triple',
  sheetIndex: number
): InvoicePrintAudience {
  if (copyMode === 'single') return 'customer';
  return sheetIndex === 0 ? 'customer' : 'internal';
}
