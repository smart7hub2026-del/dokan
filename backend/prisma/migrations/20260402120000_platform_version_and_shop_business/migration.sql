-- خوش‌بینانه برای سند پلتفرم
ALTER TABLE "PlatformState" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 0;

-- وضعیت کسب‌وکار per-shop + محصول / فاکتور / کتاب
CREATE TABLE IF NOT EXISTS "ShopStateRow" (
    "shopCode" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopStateRow_pkey" PRIMARY KEY ("shopCode")
);

CREATE TABLE IF NOT EXISTS "ShopProduct" (
    "shopCode" TEXT NOT NULL,
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "sale_price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "purchase_price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stock_shop" INTEGER NOT NULL DEFAULT 0,
    "stock_warehouse" INTEGER NOT NULL DEFAULT 0,
    "min_stock" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "tenant_id" INTEGER NOT NULL DEFAULT 0,
    "created_at" TEXT,
    "extra" JSONB,

    CONSTRAINT "ShopProduct_pkey" PRIMARY KEY ("shopCode","id")
);

CREATE INDEX IF NOT EXISTS "ShopProduct_shopCode_idx" ON "ShopProduct"("shopCode");

CREATE TABLE IF NOT EXISTS "ShopInvoice" (
    "shopCode" TEXT NOT NULL,
    "id" INTEGER NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "invoice_date" TEXT NOT NULL,
    "customer_id" INTEGER NOT NULL DEFAULT 0,
    "customer_name" TEXT NOT NULL DEFAULT '',
    "customer_phone" TEXT NOT NULL DEFAULT '',
    "seller_id" INTEGER NOT NULL DEFAULT 0,
    "seller_name" TEXT NOT NULL DEFAULT '',
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paid_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "due_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "payment_method" TEXT NOT NULL DEFAULT 'cash',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approval_status" TEXT NOT NULL DEFAULT 'pending',
    "due_date" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "tenant_id" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT,
    "items" JSONB NOT NULL,
    "extra" JSONB,

    CONSTRAINT "ShopInvoice_pkey" PRIMARY KEY ("shopCode","id")
);

CREATE INDEX IF NOT EXISTS "ShopInvoice_shopCode_idx" ON "ShopInvoice"("shopCode");
CREATE INDEX IF NOT EXISTS "ShopInvoice_shopCode_invoice_date_idx" ON "ShopInvoice"("shopCode", "invoice_date");

CREATE TABLE IF NOT EXISTS "ShopBook" (
    "shopCode" TEXT NOT NULL,
    "id" INTEGER NOT NULL,
    "sku" TEXT NOT NULL DEFAULT '',
    "isbn" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "author_name" TEXT NOT NULL DEFAULT '',
    "publisher_name" TEXT NOT NULL DEFAULT '',
    "category_id" INTEGER NOT NULL DEFAULT 0,
    "category_name" TEXT NOT NULL DEFAULT '',
    "purchase_price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sale_price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stock_shop" INTEGER NOT NULL DEFAULT 0,
    "stock_warehouse" INTEGER NOT NULL DEFAULT 0,
    "min_stock" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "tenant_id" INTEGER NOT NULL DEFAULT 0,
    "created_at" TEXT,
    "currency_code" TEXT,
    "image_url" TEXT,
    "extra" JSONB,

    CONSTRAINT "ShopBook_pkey" PRIMARY KEY ("shopCode","id")
);

CREATE INDEX IF NOT EXISTS "ShopBook_shopCode_idx" ON "ShopBook"("shopCode");
