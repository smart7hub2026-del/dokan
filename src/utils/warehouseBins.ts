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
