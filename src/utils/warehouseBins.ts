import type { Product, Book } from '../data/mockData';
import { bookToProductForSale } from './bookInventory';

/** موجودی یک کالا در سطل انبار مشخص */
export function getBinQty(p: Product, wid: number, warehouses: { id: number }[]): number {
  const raw = p.warehouse_stock_by_id;
  if (raw && typeof raw === 'object' && Object.prototype.hasOwnProperty.call(raw, String(wid))) {
    return Math.max(0, Number(raw[String(wid)]) || 0);
  }
  const first = warehouses[0]?.id;
  if (first === wid) return Math.max(0, p.stock_warehouse);
  return 0;
}

/** جمع موجودی همهٔ کالاهای فعال در یک سطل انبار */
export function ensureBinMapForProduct(p: Product, warehouses: { id: number }[]): Record<string, number> {
  const raw = p.warehouse_stock_by_id && typeof p.warehouse_stock_by_id === 'object' ? { ...p.warehouse_stock_by_id } : {};
  const firstId = warehouses[0]?.id;
  const out: Record<string, number> = {};
  for (const w of warehouses) {
    const k = String(w.id);
    if (Object.prototype.hasOwnProperty.call(raw, k)) {
      out[k] = Math.max(0, Number(raw[k]) || 0);
    } else if (w.id === firstId) {
      out[k] = Math.max(0, p.stock_warehouse);
    } else {
      out[k] = 0;
    }
  }
  return out;
}

export function sumBinQuantities(map: Record<string, number>): number {
  return Object.values(map).reduce((a, b) => a + Math.max(0, Number(b) || 0), 0);
}

/** انتقال بین یک سطل انبار و مغازه — همان منطق صفحهٔ انبار */
export function applyBinWarehouseTransfer(
  product: Product,
  warehouses: { id: number }[],
  binId: number,
  quantity: number,
  direction: 'to_shop' | 'to_warehouse'
): Product | null {
  const n = Math.floor(Number(quantity) || 0);
  if (n < 1) return null;
  const map = ensureBinMapForProduct(product, warehouses);
  const k = String(binId);
  const cur = Math.max(0, Number(map[k]) || 0);
  if (direction === 'to_shop') {
    if (n > cur) return null;
    map[k] = cur - n;
    return {
      ...product,
      stock_shop: product.stock_shop + n,
      warehouse_stock_by_id: map,
      stock_warehouse: sumBinQuantities(map),
    };
  }
  if (n > product.stock_shop) return null;
  map[k] = cur + n;
  return {
    ...product,
    stock_shop: product.stock_shop - n,
    warehouse_stock_by_id: map,
    stock_warehouse: sumBinQuantities(map),
  };
}

export function sumStockInWarehouseBin(
  binId: number,
  businessType: string,
  products: Product[],
  books: Book[],
  warehouses: { id: number }[]
): number {
  if (businessType === 'bookstore') {
    return books
      .filter((b) => b.is_active)
      .reduce((sum, b) => sum + getBinQty(bookToProductForSale(b), binId, warehouses), 0);
  }
  return products.filter((p) => p.is_active).reduce((sum, p) => sum + getBinQty(p, binId, warehouses), 0);
}
