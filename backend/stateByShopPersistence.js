/**
 * تفکیک stateByShop از PlatformState + محصول/فاکتور/کتاب در جداول با ستون‌های اصلی.
 * خطای همزمانی: پیام با پیشوند STORAGE_CONFLICT
 */

import { customerPhoneKey } from './customerValidation.js';

const BACKFILL_TX = { maxWait: 20_000, timeout: 60_000 };

function groupBy(arr, keyFn) {
  const o = {};
  for (const x of arr) {
    const k = keyFn(x);
    if (!o[k]) o[k] = [];
    o[k].push(x);
  }
  return o;
}

export function productToDbRow(shopCode, p) {
  if (!p || typeof p !== 'object') return null;
  const {
    id,
    name,
    sku,
    sale_price,
    purchase_price,
    stock_shop,
    stock_warehouse,
    min_stock,
    is_active,
    product_status,
    tenant_id,
    created_at,
    updated_by,
    ...extra
  } = p;
  const pid = Number(id);
  if (!Number.isFinite(pid)) return null;
  const skuResolved =
    sku != null && String(sku) !== ''
      ? String(sku)
      : p.barcode != null && String(p.barcode) !== ''
        ? String(p.barcode)
        : null;
  const statusRaw = product_status != null && String(product_status) !== '' ? String(product_status) : null;
  const status =
    statusRaw ||
    (is_active === false ? 'discontinued' : 'active');
  const ub = updated_by != null && Number.isFinite(Number(updated_by)) ? Number(updated_by) : null;
  return {
    shopCode,
    id: pid,
    name: String(name ?? ''),
    sku: skuResolved,
    salePrice: Number(sale_price) || 0,
    purchasePrice: Number(purchase_price) || 0,
    stockShop: Number(stock_shop) || 0,
    stockWarehouse: Number(stock_warehouse) || 0,
    minStock: Number(min_stock) || 0,
    isActive: Boolean(is_active),
    status,
    tenantId: Number(tenant_id) || 0,
    createdAt: created_at != null ? String(created_at) : null,
    updatedAt: new Date(),
    updatedBy: ub,
    extra: Object.keys(extra).length ? extra : undefined,
  };
}

export function productFromDbRow(r) {
  const ex = r.extra && typeof r.extra === 'object' ? r.extra : {};
  const barcode = ex.barcode != null && String(ex.barcode) !== '' ? String(ex.barcode) : (r.sku ?? '');
  return {
    ...ex,
    id: r.id,
    name: r.name,
    sku: r.sku ?? '',
    barcode,
    sale_price: r.salePrice,
    purchase_price: r.purchasePrice,
    stock_shop: r.stockShop,
    stock_warehouse: r.stockWarehouse,
    min_stock: r.minStock,
    is_active: r.isActive,
    product_status: r.status ?? 'active',
    tenant_id: r.tenantId,
    created_at: r.createdAt ?? '',
    updated_at: r.updatedAt ? r.updatedAt.toISOString() : undefined,
    updated_by: r.updatedBy ?? undefined,
  };
}

export function invoiceToDbRow(shopCode, inv) {
  if (!inv || typeof inv !== 'object') return null;
  const items = Array.isArray(inv.items) ? inv.items : [];
  const {
    id,
    invoice_number,
    invoice_date,
    customer_id,
    customer_name,
    customer_phone,
    seller_id,
    seller_name,
    subtotal,
    discount,
    total,
    paid_amount,
    due_amount,
    payment_method,
    status,
    approval_status,
    due_date,
    notes,
    tenant_id,
    currency,
    items: _it,
    ...extra
  } = inv;
  const iid = Number(id);
  if (!Number.isFinite(iid)) return null;
  return {
    shopCode,
    id: iid,
    invoiceNumber: String(invoice_number ?? ''),
    invoiceDate: String(invoice_date ?? ''),
    customerId: Number(customer_id) || 0,
    customerName: String(customer_name ?? ''),
    customerPhone: String(customer_phone ?? ''),
    sellerId: Number(seller_id) || 0,
    sellerName: String(seller_name ?? ''),
    subtotal: Number(subtotal) || 0,
    discount: Number(discount) || 0,
    total: Number(total) || 0,
    paidAmount: Number(paid_amount) || 0,
    dueAmount: Number(due_amount) || 0,
    paymentMethod: String(payment_method ?? 'cash'),
    status: String(status ?? 'pending'),
    approvalStatus: String(approval_status ?? 'pending'),
    dueDate: String(due_date ?? ''),
    notes: String(notes ?? ''),
    tenantId: Number(tenant_id) || 0,
    currency: currency != null ? String(currency) : null,
    items,
    extra: Object.keys(extra).length ? extra : undefined,
  };
}

export function invoiceFromDbRow(r) {
  const ex = r.extra && typeof r.extra === 'object' ? r.extra : {};
  return {
    ...ex,
    id: r.id,
    invoice_number: r.invoiceNumber,
    invoice_date: r.invoiceDate,
    customer_id: r.customerId,
    customer_name: r.customerName,
    customer_phone: r.customerPhone,
    seller_id: r.sellerId,
    seller_name: r.sellerName,
    subtotal: r.subtotal,
    discount: r.discount,
    total: r.total,
    paid_amount: r.paidAmount,
    due_amount: r.dueAmount,
    payment_method: r.paymentMethod,
    status: r.status,
    approval_status: r.approvalStatus,
    due_date: r.dueDate,
    notes: r.notes,
    tenant_id: r.tenantId,
    currency: r.currency ?? undefined,
    items: Array.isArray(r.items) ? r.items : [],
  };
}

export function bookToDbRow(shopCode, b) {
  if (!b || typeof b !== 'object') return null;
  const {
    id,
    sku,
    isbn,
    title,
    author_name,
    publisher_name,
    category_id,
    category_name,
    purchase_price,
    sale_price,
    stock_shop,
    stock_warehouse,
    min_stock,
    is_active,
    tenant_id,
    created_at,
    currency_code,
    image_url,
    ...extra
  } = b;
  const bid = Number(id);
  if (!Number.isFinite(bid)) return null;
  return {
    shopCode,
    id: bid,
    sku: String(sku ?? ''),
    isbn: String(isbn ?? ''),
    title: String(title ?? ''),
    authorName: String(author_name ?? ''),
    publisherName: String(publisher_name ?? ''),
    categoryId: Number(category_id) || 0,
    categoryName: String(category_name ?? ''),
    purchasePrice: Number(purchase_price) || 0,
    salePrice: Number(sale_price) || 0,
    stockShop: Number(stock_shop) || 0,
    stockWarehouse: Number(stock_warehouse) || 0,
    minStock: Number(min_stock) || 0,
    isActive: Boolean(is_active),
    tenantId: Number(tenant_id) || 0,
    createdAt: created_at != null ? String(created_at) : null,
    currencyCode: currency_code != null ? String(currency_code) : null,
    imageUrl: image_url != null ? String(image_url) : null,
    extra: Object.keys(extra).length ? extra : undefined,
  };
}

export function customerToDbRow(shopCode, c) {
  if (!c || typeof c !== 'object') return null;
  const id = Number(c.id);
  if (!Number.isFinite(id)) return null;
  const pk = customerPhoneKey(String(c.phone || ''));
  const {
    id: _i,
    customer_code,
    name,
    phone,
    whatsapp,
    email,
    address,
    balance,
    total_purchases,
    status,
    reminder_enabled,
    reminder_days_before,
    archived_at,
    marketing_consent,
    created_at,
    tenant_id,
    ...extra
  } = c;
  return {
    shopCode,
    id,
    phoneKey: pk || `id:${id}`,
    customerCode: String(customer_code ?? ''),
    name: String(name ?? ''),
    phone: String(phone ?? ''),
    whatsapp: whatsapp != null && String(whatsapp) !== '' ? String(whatsapp) : null,
    email: email != null && String(email) !== '' ? String(email) : null,
    address: String(address ?? ''),
    balance: Number(balance) || 0,
    totalPurchases: Number(total_purchases) || 0,
    status: String(status ?? 'active'),
    reminderEnabled: Boolean(reminder_enabled),
    reminderDaysBefore: Number(reminder_days_before) || 3,
    archivedAt: archived_at != null ? String(archived_at) : null,
    marketingConsent: marketing_consent !== false,
    createdAt: created_at != null ? String(created_at) : null,
    tenantId: Number(tenant_id) || 0,
    extra: Object.keys(extra).length ? extra : undefined,
  };
}

export function customerFromDbRow(r) {
  const ex = r.extra && typeof r.extra === 'object' ? r.extra : {};
  return {
    ...ex,
    id: r.id,
    customer_code: r.customerCode,
    name: r.name,
    phone: r.phone,
    whatsapp: r.whatsapp ?? undefined,
    email: r.email ?? undefined,
    address: r.address,
    balance: r.balance,
    total_purchases: r.totalPurchases,
    status: r.status,
    reminder_enabled: r.reminderEnabled,
    reminder_days_before: r.reminderDaysBefore,
    archived_at: r.archivedAt ?? undefined,
    marketing_consent: r.marketingConsent,
    created_at: r.createdAt ?? '',
    tenant_id: r.tenantId,
  };
}

export function bookFromDbRow(r) {
  const ex = r.extra && typeof r.extra === 'object' ? r.extra : {};
  return {
    ...ex,
    id: r.id,
    sku: r.sku,
    isbn: r.isbn,
    title: r.title,
    author_name: r.authorName,
    publisher_name: r.publisherName,
    category_id: r.categoryId,
    category_name: r.categoryName,
    purchase_price: r.purchasePrice,
    sale_price: r.salePrice,
    stock_shop: r.stockShop,
    stock_warehouse: r.stockWarehouse,
    min_stock: r.minStock,
    is_active: r.isActive,
    tenant_id: r.tenantId,
    created_at: r.createdAt ?? '',
    currency_code: r.currencyCode ?? undefined,
    image_url: r.imageUrl ?? undefined,
  };
}

export async function loadStateByShopFromRelational(prisma) {
  const rows = await prisma.shopStateRow.findMany();
  const products = await prisma.shopProduct.findMany({
    orderBy: [{ shopCode: 'asc' }, { id: 'asc' }],
  });
  const invoices = await prisma.shopInvoice.findMany({
    orderBy: [{ shopCode: 'asc' }, { id: 'asc' }],
  });
  const books = await prisma.shopBook.findMany({
    orderBy: [{ shopCode: 'asc' }, { id: 'asc' }],
  });
  const customers = await prisma.shopCustomer.findMany({
    orderBy: [{ shopCode: 'asc' }, { id: 'asc' }],
  });
  const pmap = groupBy(products, (p) => p.shopCode);
  const imap = groupBy(invoices, (i) => i.shopCode);
  const bmap = groupBy(books, (b) => b.shopCode);
  const cmap = groupBy(customers, (x) => x.shopCode);
  const out = {};
  for (const r of rows) {
    const code = r.shopCode;
    const payload = r.payload && typeof r.payload === 'object' ? r.payload : {};
    const { customers: _legacyCust, ...payloadRest } = payload;
    const fromTable = (cmap[code] || []).map(customerFromDbRow).filter(Boolean);
    const fallback = Array.isArray(_legacyCust) ? _legacyCust : [];
    out[code] = {
      ...payloadRest,
      products: (pmap[code] || []).map(productFromDbRow).filter(Boolean),
      invoices: (imap[code] || []).map(invoiceFromDbRow).filter(Boolean),
      books: (bmap[code] || []).map(bookFromDbRow).filter(Boolean),
      customers: fromTable.length > 0 ? fromTable : fallback,
    };
  }
  return out;
}

/**
 * مهاجرت یک‌باره از JSON قدیمی stateByShop داخل PlatformState.
 */
export async function migrateLegacyStateByShopTx(tx, db, legacy, platformStateId) {
  const keys = Object.keys(legacy);
  if (keys.length === 0) return;
  for (const code of keys) {
    const st = legacy[code];
    if (!st || typeof st !== 'object') continue;
    const products = Array.isArray(st.products) ? st.products : [];
    const invoices = Array.isArray(st.invoices) ? st.invoices : [];
    const books = Array.isArray(st.books) ? st.books : [];
    const legacyCust = Array.isArray(st.customers) ? st.customers : [];
    const { products: _p, invoices: _i, books: _b, customers: _c0, ...rest } = st;
    await tx.shopStateRow.create({
      data: { shopCode: code, payload: rest, version: 0 },
    });
    for (const p of products) {
      const row = productToDbRow(code, p);
      if (row) await tx.shopProduct.create({ data: row });
    }
    for (const inv of invoices) {
      const row = invoiceToDbRow(code, inv);
      if (row) await tx.shopInvoice.create({ data: row });
    }
    for (const b of books) {
      const row = bookToDbRow(code, b);
      if (row) await tx.shopBook.create({ data: row });
    }
    for (const cust of legacyCust) {
      const row = customerToDbRow(code, cust);
      if (row) await tx.shopCustomer.create({ data: row });
    }
  }
  const stateBlob = preparePlatformStateBlob(db);
  stateBlob.stateByShop = {};
  await tx.platformState.update({
    where: { id: platformStateId },
    data: { state: stateBlob },
  });
}

export function preparePlatformStateBlob(db) {
  const {
    __platformVersion: _pv,
    __shopStateVersions: _sv,
    shops: _sh,
    stateByShop: _sb,
    ...rest
  } = db;
  return { ...rest, shops: [], stateByShop: {} };
}

/**
 * persist محتوای stateByShop + نسخهٔ هر فروشگاه (خوش‌بینانه).
 */
export async function persistStateByShopTx(tx, db, shopStateVersions) {
  const sb = db.stateByShop && typeof db.stateByShop === 'object' ? db.stateByShop : {};
  const keys = Object.keys(sb);
  const existing = await tx.shopStateRow.findMany({ select: { shopCode: true } });
  const existingSet = new Set(existing.map((r) => r.shopCode));
  for (const code of existingSet) {
    if (!keys.includes(code)) {
      await tx.shopProduct.deleteMany({ where: { shopCode: code } });
      await tx.shopInvoice.deleteMany({ where: { shopCode: code } });
      await tx.shopBook.deleteMany({ where: { shopCode: code } });
      await tx.shopCustomer.deleteMany({ where: { shopCode: code } });
      await tx.shopStateRow.delete({ where: { shopCode: code } });
    }
  }
  for (const code of keys) {
    const st = sb[code];
    if (!st || typeof st !== 'object') continue;
    const products = Array.isArray(st.products) ? st.products : [];
    const invoices = Array.isArray(st.invoices) ? st.invoices : [];
    const books = Array.isArray(st.books) ? st.books : [];
    const custList = Array.isArray(st.customers) ? st.customers : [];
    const { products: _1, invoices: _2, books: _3, customers: _4, ...rest } = st;
    const prev = await tx.shopStateRow.findUnique({ where: { shopCode: code } });
    const expectedV = shopStateVersions?.[code];
    await tx.shopProduct.deleteMany({ where: { shopCode: code } });
    await tx.shopInvoice.deleteMany({ where: { shopCode: code } });
    await tx.shopBook.deleteMany({ where: { shopCode: code } });
    await tx.shopCustomer.deleteMany({ where: { shopCode: code } });
    for (const p of products) {
      const row = productToDbRow(code, p);
      if (row) await tx.shopProduct.create({ data: row });
    }
    for (const inv of invoices) {
      const row = invoiceToDbRow(code, inv);
      if (row) await tx.shopInvoice.create({ data: row });
    }
    for (const b of books) {
      const row = bookToDbRow(code, b);
      if (row) await tx.shopBook.create({ data: row });
    }
    for (const cust of custList) {
      const row = customerToDbRow(code, cust);
      if (row) await tx.shopCustomer.create({ data: row });
    }
    if (!prev) {
      await tx.shopStateRow.create({
        data: { shopCode: code, payload: rest, version: 0 },
      });
    } else {
      const v = expectedV !== undefined ? expectedV : prev.version;
      const u = await tx.shopStateRow.updateMany({
        where: { shopCode: code, version: v },
        data: { payload: rest, version: { increment: 1 } },
      });
      if (u.count === 0) {
        throw new Error(`STORAGE_CONFLICT:SHOP:${code}`);
      }
    }
  }
}

export async function refreshShopStateVersions(prisma, db) {
  const rows = await prisma.shopStateRow.findMany({
    select: { shopCode: true, version: true },
  });
  db.__shopStateVersions = Object.fromEntries(rows.map((r) => [r.shopCode, r.version]));
}

/** یک‌بار: مشتریان داخل payload را به shop_customers منتقل می‌کند. */
export async function backfillCustomersFromShopPayload(prisma) {
  const rows = await prisma.shopStateRow.findMany();
  for (const r of rows) {
    const payload = r.payload && typeof r.payload === 'object' ? r.payload : {};
    const list = Array.isArray(payload.customers) ? payload.customers : [];
    if (list.length === 0) continue;
    const n = await prisma.shopCustomer.count({ where: { shopCode: r.shopCode } });
    if (n > 0) continue;
    await prisma.$transaction(
      async (tx) => {
        const { customers: _d, ...rest } = payload;
        for (const cust of list) {
          const row = customerToDbRow(r.shopCode, cust);
          if (row) await tx.shopCustomer.create({ data: row });
        }
        await tx.shopStateRow.update({
          where: { shopCode: r.shopCode },
          data: { payload: rest },
        });
      },
      BACKFILL_TX,
    );
  }
}
